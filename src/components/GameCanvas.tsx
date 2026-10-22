"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { soundEffects } from "@/lib/sound";
import {
  Volume2,
  VolumeX,
  Music,
  Heart,
  Pause,
  Play,
  RotateCcw,
  LogOut,
  Target,
  Sparkles,
  Trophy,
  AlertTriangle,
} from "lucide-react";

interface GameCanvasProps {
  playerName: string;
  onExit: () => void;
  onGameComplete: (completionTime: string, completionTimeSeconds: number) => void;
}

// 6가지 파스텔 색상 정의
const BRICK_COLORS = {
  LIGHT_RED: "#f87171",    // 연한 빨강 (목표 타깃)
  LIGHT_ORANGE: "#fb923c", // 연한 주황
  LIGHT_YELLOW: "#fde047", // 연한 노랑
  LIGHT_BLUE: "#60a5fa",   // 연한 파랑
  LIGHT_GREEN: "#4ade80",  // 연한 초록
  LIGHT_PURPLE: "#c084fc", // 연한 보라
};

const OTHER_COLORS = [
  BRICK_COLORS.LIGHT_ORANGE,
  BRICK_COLORS.LIGHT_YELLOW,
  BRICK_COLORS.LIGHT_BLUE,
  BRICK_COLORS.LIGHT_GREEN,
  BRICK_COLORS.LIGHT_PURPLE,
];

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isRed: boolean;
  intact: boolean;
}

export default function GameCanvas({
  playerName,
  onExit,
  onGameComplete,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 음원 레퍼런스
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // 게임 상태 관리
  const [countdown, setCountdown] = useState<number | null>(3);
  const [lives, setLives] = useState<number>(3);
  const [redBrokenCount, setRedBrokenCount] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameState, setGameState] = useState<"countdown" | "playing" | "paused" | "success" | "failure">("countdown");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // 사운드 설정
  const [isBgmOn, setIsBgmOn] = useState<boolean>(true);
  const [isSfxOn, setIsSfxOn] = useState<boolean>(true);

  // 게임 루프 및 캔버스 가상 좌표계 (너비 800, 높이 600 기준)
  const V_WIDTH = 800;
  const V_HEIGHT = 600;

  // 게임 내부 상태 Refs
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const livesRef = useRef(lives);
  livesRef.current = lives;

  const redBrokenCountRef = useRef(redBrokenCount);
  redBrokenCountRef.current = redBrokenCount;

  const elapsedSecondsRef = useRef(elapsedSeconds);
  elapsedSecondsRef.current = elapsedSeconds;

  // 패들 및 볼 물리 상태
  const paddleRef = useRef({
    x: 340,
    y: 550,
    width: 120,
    height: 16,
    speed: 9,
    dx: 0,
  });

  const ballRef = useRef({
    x: 400,
    y: 535,
    radius: 9,
    dx: 4.5,
    dy: -4.5,
    speed: 6.5,
    stuckToPaddle: true,
  });

  const bricksRef = useRef<Brick[]>([]);
  const keysPressedRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // 벽돌 초기화 함수 (5행 x 8열 = 총 40개, 빨강 정확히 12개, 나머지 28개 랜덤)
  const initBricks = useCallback(() => {
    const totalBricks = 40;
    const redCount = 12;
    const otherCount = totalBricks - redCount;

    // 12개 빨강 + 28개 기타 파스텔
    const colorArray: { color: string; isRed: boolean }[] = [];
    for (let i = 0; i < redCount; i++) {
      colorArray.push({ color: BRICK_COLORS.LIGHT_RED, isRed: true });
    }
    for (let i = 0; i < otherCount; i++) {
      const randomColor = OTHER_COLORS[Math.floor(Math.random() * OTHER_COLORS.length)];
      colorArray.push({ color: randomColor, isRed: false });
    }

    // Fisher-Yates 셔플로 랜덤 배치
    for (let i = colorArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorArray[i], colorArray[j]] = [colorArray[j], colorArray[i]];
    }

    const rows = 5;
    const cols = 8;
    const padding = 10;
    const offsetTop = 60;
    const offsetLeft = 35;
    const brickWidth = Math.floor((V_WIDTH - offsetLeft * 2 - padding * (cols - 1)) / cols);
    const brickHeight = 26;

    const newBricks: Brick[] = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const item = colorArray[idx++];
        newBricks.push({
          x: offsetLeft + c * (brickWidth + padding),
          y: offsetTop + r * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          color: item.color,
          isRed: item.isRed,
          intact: true,
        });
      }
    }
    bricksRef.current = newBricks;
  }, []);

  // 공과 패들 원위치 리셋
  const resetBallAndPaddle = useCallback(() => {
    paddleRef.current.x = (V_WIDTH - paddleRef.current.width) / 2;
    ballRef.current.x = V_WIDTH / 2;
    ballRef.current.y = paddleRef.current.y - ballRef.current.radius - 1;
    // 위쪽 대각선으로 랜덤 발사
    const angle = (Math.PI / 4) + (Math.random() * (Math.PI / 2)); // 45도 ~ 135도
    const speed = 6.2;
    ballRef.current.dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    ballRef.current.dy = -Math.abs(Math.sin(angle) * speed);
  }, []);

  // 전체 게임 리셋 및 시작
  const startNewGame = useCallback(() => {
    initBricks();
    resetBallAndPaddle();
    setLives(3);
    setRedBrokenCount(0);
    setElapsedSeconds(0);
    setCountdown(3);
    setGameState("countdown");

    // BGM 재생 준비
    if (bgmRef.current) {
      bgmRef.current.currentTime = 0;
    }
  }, [initBricks, resetBallAndPaddle]);

  // BGM 인스턴스 생성 및 음소거 동기화
  useEffect(() => {
    const bgm = new Audio("/Hyper_Speed_Run.mp3");
    bgm.loop = true;
    bgm.volume = 0.45;
    bgmRef.current = bgm;

    return () => {
      bgm.pause();
      bgmRef.current = null;
    };
  }, []);

  // BGM 및 SFX On/Off 동기화
  useEffect(() => {
    soundEffects.setSoundEnabled(isSfxOn);
  }, [isSfxOn]);

  useEffect(() => {
    if (!bgmRef.current) return;
    if (isBgmOn && gameState === "playing") {
      bgmRef.current.play().catch(() => {});
    } else {
      bgmRef.current.pause();
    }
  }, [isBgmOn, gameState]);

  // 카운트다운 타이머 (3 -> 2 -> 1 -> 시작)
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
        setGameState("playing");
        if (isBgmOn && bgmRef.current) {
          bgmRef.current.play().catch(() => {});
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [countdown, gameState, isBgmOn]);

  // 플레이 중 경과 시간 측정 (100ms 단위 정밀 계산)
  useEffect(() => {
    if (gameState !== "playing") return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  // 폭죽 이펙트 트리거
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#f87171", "#fb923c", "#fde047", "#60a5fa", "#4ade80", "#c084fc"],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#f87171", "#fb923c", "#fde047", "#60a5fa", "#4ade80", "#c084fc"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // 키보드 조작 이벤트 리스너 (PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        keysPressedRef.current.left = true;
      } else if (e.key === "ArrowRight") {
        keysPressedRef.current.right = true;
      } else if (e.key === " " || e.key === "Spacebar") {
        // 스페이스바로 일시정지/재개 토글
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        keysPressedRef.current.left = false;
      } else if (e.key === "ArrowRight") {
        keysPressedRef.current.right = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 모바일 터치 및 스와이프 조작 (화면 스크롤 방지 포함)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current || e.touches.length === 0) return;

      const currentX = e.touches[0].clientX;
      const diffX = currentX - touchStartRef.current.x;

      const rect = canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaledDiffX = diffX * scaleX;

      // 부드러운 패들 이동
      paddleRef.current.x = Math.max(
        0,
        Math.min(V_WIDTH - paddleRef.current.width, paddleRef.current.x + scaledDiffX * 0.9)
      );

      touchStartRef.current = {
        x: currentX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      touchStartRef.current = null;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  // 포맷팅 함수: 초 -> MM:SS
  const formatTime = (totalSec: number) => {
    const secInt = Math.floor(totalSec);
    const m = Math.floor(secInt / 60);
    const s = secInt % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // 일시정지 / 재개 핸들러
  const togglePause = () => {
    if (gameStateRef.current === "playing") {
      setGameState("paused");
      if (bgmRef.current) bgmRef.current.pause();
    } else if (gameStateRef.current === "paused") {
      setGameState("playing");
      if (isBgmOn && bgmRef.current) bgmRef.current.play().catch(() => {});
    }
  };

  // 게임 루프 (requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      const currentState = gameStateRef.current;

      // 1. 물리 연산 (playing 상태일 때만)
      if (currentState === "playing") {
        const paddle = paddleRef.current;
        const ball = ballRef.current;

        // 키보드 입력에 따른 패들 이동
        if (keysPressedRef.current.left) {
          paddle.x -= paddle.speed;
        }
        if (keysPressedRef.current.right) {
          paddle.x += paddle.speed;
        }

        // 패들 경계선 제한
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > V_WIDTH) paddle.x = V_WIDTH - paddle.width;

        // 볼 위치 이동
        ball.x += ball.dx;
        ball.y += ball.dy;

        // 좌우 벽 충돌
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.dx = Math.abs(ball.dx);
          soundEffects.playWallHit();
        } else if (ball.x + ball.radius >= V_WIDTH) {
          ball.x = V_WIDTH - ball.radius;
          ball.dx = -Math.abs(ball.dx);
          soundEffects.playWallHit();
        }

        // 상단 벽 충돌
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.dy = Math.abs(ball.dy);
          soundEffects.playWallHit();
        }

        // 패들과 볼 충돌 감지
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x + ball.radius >= paddle.x &&
          ball.x - ball.radius <= paddle.x + paddle.width &&
          ball.dy > 0
        ) {
          // 패들의 어느 위치에 맞았는지에 따라 각도 조절 (-1 ~ 1)
          const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
          const maxBounceAngle = (5 * Math.PI) / 12; // 최대 약 75도
          const bounceAngle = hitPoint * maxBounceAngle;
          const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

          ball.dx = currentSpeed * Math.sin(bounceAngle);
          ball.dy = -Math.abs(currentSpeed * Math.cos(bounceAngle));
          ball.y = paddle.y - ball.radius - 1; // 겹침 방지
          soundEffects.playPaddleHit();
        }

        // 벽돌 충돌 감지 (단일 프레임 내 중복 방지)
        let hitBrick = false;
        for (let i = 0; i < bricksRef.current.length; i++) {
          const brick = bricksRef.current[i];
          if (!brick.intact) continue;

          // 공의 AABB 사각형 교차 검사
          if (
            ball.x + ball.radius > brick.x &&
            ball.x - ball.radius < brick.x + brick.width &&
            ball.y + ball.radius > brick.y &&
            ball.y - ball.radius < brick.y + brick.height
          ) {
            // 벽돌 파괴
            brick.intact = false;
            hitBrick = true;

            // 반사 방향 계산: 이전 프레임 위치 기반 또는 겹침 깊이 비교
            const overlapLeft = ball.x + ball.radius - brick.x;
            const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
            const overlapTop = ball.y + ball.radius - brick.y;
            const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);

            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);

            if (minOverlapX < minOverlapY) {
              ball.dx = -ball.dx;
            } else {
              ball.dy = -ball.dy;
            }

            // 빨강 벽돌 카운트 처리
            if (brick.isRed) {
              soundEffects.playBrickHit(true);
              const nextCount = redBrokenCountRef.current + 1;
              redBrokenCountRef.current = nextCount;
              setRedBrokenCount(nextCount);

              // 성공 조건: 빨강 벽돌 3개 제거 시 즉시 미션 성공!
              if (nextCount >= 3) {
                setGameState("success");
                if (bgmRef.current) bgmRef.current.pause();
                soundEffects.playVictory();
                triggerConfetti();

                const finalSec = Math.floor(elapsedSecondsRef.current);
                const finalTime = formatTime(finalSec);
                onGameComplete(finalTime, finalSec);
                break;
              }
            } else {
              soundEffects.playBrickHit(false);
            }

            break; // 한 프레임에 벽돌 하나만 충돌
          }
        }

        // 바닥으로 떨어진 경우 (생명 감소)
        if (ball.y - ball.radius > V_HEIGHT) {
          const nextLives = livesRef.current - 1;
          livesRef.current = nextLives;
          setLives(nextLives);
          soundEffects.playLifeLost();

          if (nextLives <= 0) {
            setGameState("failure");
            if (bgmRef.current) bgmRef.current.pause();
            soundEffects.playFailure();
          } else {
            resetBallAndPaddle();
          }
        }
      }

      // 2. 렌더링 루틴
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // 배경 그라데이션 및 그리드 효과
      const bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
      bgGrad.addColorStop(0, "#0b0f19");
      bgGrad.addColorStop(1, "#111827");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // 격자 라인 패턴 (아케이드 느낌)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < V_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, V_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < V_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(V_WIDTH, y);
        ctx.stroke();
      }

      // 벽돌 그리기
      bricksRef.current.forEach((brick) => {
        if (!brick.intact) return;

        // 벽돌 본체
        ctx.fillStyle = brick.color;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 6);
        ctx.fill();

        // 상단 입체 하이라이트
        ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height / 3, [6, 6, 0, 0]);
        ctx.fill();

        // 빨강 타깃 벽돌의 경우 특별한 반짝임 테두리 추가
        if (brick.isRed) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // 타깃 심볼 아이콘 작은 원
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 패들 그리기
      const paddle = paddleRef.current;
      const paddleGrad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
      paddleGrad.addColorStop(0, "#38bdf8"); // Sky 400
      paddleGrad.addColorStop(1, "#0284c7"); // Sky 600

      ctx.fillStyle = paddleGrad;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 8);
      ctx.fill();
      ctx.shadowBlur = 0; // 초기화

      // 패들 중심 포인트
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(paddle.x + paddle.width / 2 - 12, paddle.y + 4, 24, paddle.height - 8, 4);
      ctx.fill();

      // 공 그리기
      const ball = ballRef.current;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameComplete]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto select-none">
      {/* 상단 게임 정보 대시보드 */}
      <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 mb-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* 플레이어 이름 및 생명 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Player</span>
            <span className="font-bold text-amber-400 text-base">{playerName}</span>
          </div>

          <div className="h-5 w-[1px] bg-slate-800" />

          {/* 생명 아이콘 (하트 3개) */}
          <div className="flex items-center gap-1.5" title="남은 생명">
            {[1, 2, 3].map((num) => (
              <Heart
                key={num}
                className={`w-6 h-6 transition-all duration-300 ${
                  num <= lives
                    ? "fill-rose-500 text-rose-500 scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    : "text-slate-700 scale-90"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 미션 목표 진행도 (빨강 벽돌 3개 제거) */}
        <div className="flex items-center gap-3 bg-rose-950/40 border border-rose-500/40 px-3.5 py-1.5 rounded-xl shadow-inner">
          <Target className="w-5 h-5 text-rose-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[11px] text-rose-300 font-medium">빨강 벽돌 제거 미션</span>
            <span className="text-base font-extrabold text-rose-400 tracking-wider">
              {redBrokenCount} / 3
            </span>
          </div>
        </div>

        {/* 타이머 */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700/60 font-mono">
          <span className="text-xs text-slate-400">TIME</span>
          <span className="text-xl font-bold text-cyan-400 tracking-wider">
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* 사운드 토글 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBgmOn(!isBgmOn)}
            className={`p-2 rounded-xl transition-all ${
              isBgmOn
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30"
                : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300"
            }`}
            title={isBgmOn ? "배경음악 끄기" : "배경음악 켜기"}
          >
            <Music className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSfxOn(!isSfxOn)}
            className={`p-2 rounded-xl transition-all ${
              isSfxOn
                ? "bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30"
                : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300"
            }`}
            title={isSfxOn ? "효과음 끄기" : "효과음 켜기"}
          >
            {isSfxOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 캔버스 뷰포트 컨테이너 */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] max-w-[800px] max-h-[600px] rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-black touch-none"
      >
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full block"
        />

        {/* 최초 3 -> 2 -> 1 카운트다운 오버레이 */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-20">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-rose-400 to-cyan-400 animate-ping">
              {countdown === 0 ? "GO!" : countdown}
            </div>
            <p className="mt-6 text-lg text-slate-300 font-medium tracking-wider">
              {countdown === 0 ? "빨강 벽돌 3개를 제거하세요!" : "게임 준비..."}
            </p>
          </div>
        )}

        {/* 일시정지 오버레이 */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
            <Pause className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
            <h3 className="text-3xl font-extrabold text-white mb-2">게임 일시정지</h3>
            <p className="text-sm text-slate-400 mb-6">스페이스바를 누르거나 아래 버튼으로 재개하세요.</p>
            <button
              onClick={togglePause}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg hover:shadow-cyan-500/30 flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> 게임 재개
            </button>
          </div>
        )}

        {/* 게임 미션 성공 오버레이 */}
        {gameState === "success" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 p-6 text-center animate-fadeIn">
            <div className="p-4 bg-amber-500/20 border border-amber-400/40 rounded-full mb-3 text-amber-300">
              <Trophy className="w-16 h-16 animate-pulse" />
            </div>
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-yellow-300 mb-2">
              게임 미션 성공!
            </h2>
            <p className="text-slate-300 text-base mb-4">
              빨강 벽돌 3개를 모두 제거하여 미션을 완료했습니다!
            </p>

            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 px-8 mb-6 shadow-inner">
              <span className="text-xs text-slate-400 block mb-1">최종 완료 시간</span>
              <span className="text-3xl font-mono font-black text-cyan-400 tracking-wider">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            <div className="flex gap-4">
              <button
                onClick={startNewGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> 다시 도전
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700 flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" /> 메인으로
              </button>
            </div>
          </div>
        )}

        {/* 게임 미션 실패 오버레이 */}
        {gameState === "failure" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 p-6 text-center">
            <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-full mb-3 text-rose-400">
              <AlertTriangle className="w-16 h-16" />
            </div>
            <h2 className="text-4xl font-extrabold text-rose-500 mb-2">
              게임 미션 실패
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              모든 생명을 소진하였습니다. 다시 도전해 보세요!
            </p>

            <div className="flex gap-4">
              <button
                onClick={startNewGame}
                className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> 다시 시작
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700 flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" /> 메인으로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 바 (일시정지, 다시 시작) */}
      <div className="w-full mt-4 flex items-center justify-between gap-3">
        <button
          onClick={togglePause}
          disabled={gameState === "countdown" || gameState === "success" || gameState === "failure"}
          className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
            gameState === "paused"
              ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          } disabled:opacity-40 disabled:pointer-events-none`}
        >
          {gameState === "paused" ? (
            <>
              <Play className="w-4 h-4 fill-current" /> 게임 재개
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" /> 일시정지
            </>
          )}
        </button>

        <button
          onClick={onExit}
          className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <RotateCcw className="w-4 h-4" /> 다시 시작
        </button>
      </div>

      {/* 조작법 안내 가이드바 */}
      <div className="w-full mt-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">→</kbd>
          PC: 좌우 방향키로 패들 조작
        </span>
        <span className="flex items-center gap-1">
          📱 모바일: 화면 좌우 스와이프 터치 조작
        </span>
      </div>
    </div>
  );
}
