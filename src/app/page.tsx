"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { GameRecord, CreatorInfo } from "@/types/game";
import GameCanvas from "@/components/GameCanvas";
import {
  Trophy,
  Play,
  User,
  Info,
  Medal,
  RefreshCw,
  Sparkles,
  Gamepad2,
  BookOpen,
} from "lucide-react";

// 제작자 정보 기본값 (쉽게 수정 가능하도록 분리)
const INITIAL_CREATOR_INFO: CreatorInfo = {
  department: "컴퓨터공학부",
  studentId: "202300000",
  name: "홍길동",
};

export default function Home() {
  const [inGame, setInGame] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [inputError, setInputError] = useState<string>("");

  // 제작자 정보
  const [creatorInfo] = useState<CreatorInfo>(INITIAL_CREATOR_INFO);

  // Top 3 랭킹 상태
  const [topRecords, setTopRecords] = useState<GameRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);

  // 랭킹 불러오기
  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch("/api/records");
      if (res.ok) {
        const json = await res.json();
        // { top3: [...] } 또는 배열 형태 처리
        const list: GameRecord[] = json.top3 || (Array.isArray(json) ? json : json.data) || [];
        setTopRecords(list.slice(0, 3));
      }
    } catch (err) {
      console.error("기록 불러오기 실패:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // 게임 시작 처리
  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setInputError("사용자 이름을 입력해 주세요!");
      return;
    }
    setInputError("");
    setInGame(true);
  };

  // 게임 성공 시 결과 서버/구글시트에 전송
  const handleGameComplete = async (
    completionTime: string,
    completionTimeSeconds: number
  ) => {
    try {
      const newRecord = {
        action: "create",
        name: playerName.trim(),
        finishtime: completionTime,
        completionTime,
        completionTimeSeconds,
      };

      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });

      // 등록 직후 최신 구글 시트 랭킹 새로고침
      await fetchRecords();
    } catch (err) {
      console.error("기록 저장 중 에러 발생:", err);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100">
      {/* 헤더 네비게이션 영역 */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
            <Image
              src="/Mascot.jpg"
              alt="INU 마스코트"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-rose-400 flex items-center gap-2">
              INU 벽돌깨기
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                ARCADE
              </span>
            </h1>
            <p className="text-xs text-slate-400">인천대학교 아케이드 미션 챌린지</p>
          </div>
        </div>

        {/* 제작자 프로필 뱃지 */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs text-slate-300 shadow-sm">
          <span className="text-slate-500">제작:</span>
          <span className="text-cyan-400 font-medium">{creatorInfo.department}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">{creatorInfo.studentId}</span>
          <span className="text-slate-600">|</span>
          <span className="font-bold text-white">{creatorInfo.name}</span>
        </div>
      </header>

      {/* 게임 진행 중 화면 */}
      {inGame ? (
        <div className="w-full max-w-4xl flex-1 flex flex-col justify-center items-center">
          <GameCanvas
            playerName={playerName}
            onExit={() => setInGame(false)}
            onGameComplete={handleGameComplete}
          />
        </div>
      ) : (
        /* 메인 대기 화면 */
        <div className="w-full max-w-5xl flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
          {/* 좌측: 게임 시작 & 마스코트 섹션 (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-xl flex-shrink-0">
                  <Image
                    src="/Mascot.jpg"
                    alt="INU 마스코트"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    스페셜 타깃 미션
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    빨강 벽돌 3개를 격파하라!
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    총 40개의 파스텔 벽돌 중 숨겨진 <span className="text-rose-400 font-bold">12개의 연한 빨강 벽돌</span> 가운데
                    3개를 가장 빠른 속도로 제거해 보세요.
                  </p>
                </div>
              </div>

              {/* 닉네임 입력 및 시작 폼 */}
              <form onSubmit={handleStartGame} className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    도전자 닉네임 / 이름
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      id="playerName"
                      type="text"
                      maxLength={12}
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        if (inputError) setInputError("");
                      }}
                      placeholder="이름을 입력하세요 (예: 인천대홍길동)"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-medium text-base shadow-inner"
                    />
                  </div>
                  {inputError && (
                    <p className="text-rose-400 text-xs font-semibold mt-2 animate-bounce">
                      {inputError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-black text-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  게임 시작
                </button>
              </form>

              {/* 모바일 화면용 제작자 정보 표시 */}
              <div className="sm:hidden mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
                <span>제작: {creatorInfo.department} / {creatorInfo.studentId} / {creatorInfo.name}</span>
              </div>
            </div>

            {/* 게임 방법 및 조작 안내 카드 */}
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                게임 규칙 및 플레이 가이드
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-slate-300">조작:</strong> PC는 키보드 좌우 방향키(←, →), 모바일은 화면 터치 스와이프로 조작합니다.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-slate-300">목표:</strong> 연한 빨강 벽돌 3개를 깨면 타이머가 정지하며 즉시 미션 성공!
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-slate-300">생명:</strong> 하트 3개 제공. 공이 바닥에 떨어질 때마다 1개씩 감소합니다.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-slate-300">사운드:</strong> 배경음악과 충돌 효과음 On/Off 기능을 상단에서 지원합니다.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* 우측: 명예의 전당 Top 3 랭킹 섹션 (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">명예의 전당 (Top 3)</h3>
                    <p className="text-[11px] text-slate-400">가장 빠른 시간 내 완료한 챔피언</p>
                  </div>
                </div>

                <button
                  onClick={fetchRecords}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  title="순위 새로고침"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingRecords ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* 랭킹 리스트 */}
              <div className="mt-4 space-y-3">
                {isLoadingRecords ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    기록을 불러오는 중...
                  </div>
                ) : topRecords.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    아직 등록된 성공 기록이 없습니다. 첫 번째 챔피언이 되어보세요!
                  </div>
                ) : (
                  topRecords.map((rec, index) => {
                    const badgeStyles = [
                      "from-amber-400 to-yellow-600 text-slate-950 shadow-amber-500/20", // 1등 금
                      "from-slate-300 to-slate-500 text-slate-950 shadow-slate-400/20", // 2등 은
                      "from-amber-700 to-amber-900 text-amber-100 shadow-amber-800/20", // 3등 동
                    ];

                    return (
                      <div
                        key={rec.id || index}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all shadow-inner"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center font-black text-sm shadow-md ${badgeStyles[index] || "from-slate-700 to-slate-800 text-slate-300"}`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200 text-sm block">
                              {rec.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {rec.createdAt ? rec.createdAt.split(" ")[0] : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-extrabold text-cyan-400 text-base">
                            {rec.completionTime}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {rec.completionTimeSeconds?.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>* 미션 성공 시 Google Sheets에 자동 집계됩니다.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 영역 */}
      <footer className="w-full max-w-5xl py-4 mt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          © 2026 INU 벽돌깨기. AI 코딩을 활용한 창의적 앱 개발 과제.
        </div>
        <div className="flex items-center gap-3">
          <span>학과: <strong className="text-slate-400">{creatorInfo.department}</strong></span>
          <span>학번: <strong className="text-slate-400">{creatorInfo.studentId}</strong></span>
          <span>이름: <strong className="text-slate-400">{creatorInfo.name}</strong></span>
        </div>
      </footer>
    </main>
  );
}
