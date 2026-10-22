import { NextResponse } from "next/server";
import { GameRecord } from "@/types/game";

// 구글 앱스 스크립트 연결 실패 시 사용하는 기본 인메모리 기록
const fallbackRecords: GameRecord[] = [
  {
    id: "sample-1",
    name: "인천대대표",
    completionTime: "00:24",
    completionTimeSeconds: 24,
    createdAt: "2026-10-20 14:30:00",
  },
  {
    id: "sample-2",
    name: "벽돌마스터",
    completionTime: "00:35",
    completionTimeSeconds: 35,
    createdAt: "2026-10-21 11:20:00",
  },
  {
    id: "sample-3",
    name: "스피드러너",
    completionTime: "00:48",
    completionTimeSeconds: 48,
    createdAt: "2026-10-21 19:10:00",
  },
];

function getGoogleScriptUrl(): string | undefined {
  const url = (
    process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
    process.env.GOOGLE_SHEETS_WEBAPP_URL ||
    ""
  ).trim();
  return url.length > 0 ? url : undefined;
}

// "MM:SS" 또는 임의 문자열을 초(seconds) 및 표시용 MM:SS로 정규화
function normalizeTime(val: unknown): { display: string; seconds: number } {
  if (!val) return { display: "00:00", seconds: 999999 };
  const str = String(val).trim();

  // 구글 시트가 날짜 문자열로 변환했을 경우 (예: "Sat Dec 30 1899 00:22:00 ...")
  if (str.includes("GMT") || str.includes("1899")) {
    const match = str.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const min = parseInt(match[2], 10);
      const sec = parseInt(match[3], 10);
      const formatted = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
      return { display: formatted, seconds: min * 60 + sec };
    }
  }

  // 일반 "MM:SS" 형태
  if (str.includes(":")) {
    const parts = str.split(":");
    const min = parseFloat(parts[0]) || 0;
    const sec = parseFloat(parts[1]) || 0;
    const formatted = `${Math.floor(min).toString().padStart(2, "0")}:${Math.floor(sec).toString().padStart(2, "0")}`;
    return { display: formatted, seconds: min * 60 + sec };
  }

  const num = parseFloat(str) || 999999;
  return { display: str, seconds: num };
}

// ============================================================
// 1. GET: 기록 조회
// ============================================================
export async function GET() {
  const scriptUrl = getGoogleScriptUrl();

  if (scriptUrl) {
    try {
      const response = await fetch(scriptUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        redirect: "follow",
        cache: "no-store",
      });

      if (response.ok) {
        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch {
          console.error("GAS 반환값이 JSON 형식이 아닙니다:", text.slice(0, 300));
        }

        if (result) {
          const rawList = Array.isArray(result) ? result : result.data;

          if (Array.isArray(rawList)) {
            const formatted: GameRecord[] = rawList.map((item, idx) => {
              const timeInfo = normalizeTime(item.finishtime || item.completionTime);
              return {
                id: `sheet-${idx}-${item.rowIndex || idx}`,
                name: item.name || "익명",
                completionTime: timeInfo.display,
                completionTimeSeconds:
                  item.completionTimeSeconds != null
                    ? Number(item.completionTimeSeconds)
                    : timeInfo.seconds,
                createdAt: item.timestamp || item.createdAt || "",
              };
            });

            const sorted = formatted.sort(
              (a, b) => a.completionTimeSeconds - b.completionTimeSeconds
            );

            return NextResponse.json({
              success: true,
              source: "google_sheets",
              top3: sorted.slice(0, 3),
              all: sorted,
            });
          }
        }
      }
    } catch (error) {
      console.error("Google Sheets fetch error (falling back to memory):", error);
    }
  }

  // 폴백 데이터
  const sorted = [...fallbackRecords].sort(
    (a, b) => a.completionTimeSeconds - b.completionTimeSeconds
  );
  return NextResponse.json({
    success: true,
    source: scriptUrl ? "google_sheets_error_fallback" : "no_url_configured",
    top3: sorted.slice(0, 3),
    all: sorted,
  });
}

// ============================================================
// 2. POST: Create, Update, Delete
// ============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = (body.action || "create").toLowerCase();
    const scriptUrl = getGoogleScriptUrl();

    // [CREATE] 게임 성공 기록
    if (action === "create") {
      const name = body.name?.trim() || "익명";
      const finishtime = body.finishtime || body.completionTime || "00:00";
      const timestamp =
        body.timestamp ||
        new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      const timeInfo = normalizeTime(finishtime);

      if (scriptUrl) {
        try {
          const res = await fetch(scriptUrl, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
              action: "create",
              name,
              finishtime: timeInfo.display,
              timestamp,
            }),
            redirect: "follow",
          });

          const resText = await res.text();
          let resData;
          try {
            resData = JSON.parse(resText);
          } catch {
            resData = { raw: resText };
          }

          return NextResponse.json({
            success: true,
            source: "google_sheets",
            message: "구글 시트에 성공적으로 등록되었습니다.",
            result: resData,
          });
        } catch (err) {
          console.error("Google Sheets POST fetch error:", err);
        }
      }

      // URL 미설정 시 로컬 메모리 저장
      const newRecord: GameRecord = {
        id: "rec-" + Date.now(),
        name,
        completionTime: timeInfo.display,
        completionTimeSeconds: timeInfo.seconds,
        createdAt: timestamp,
      };
      fallbackRecords.push(newRecord);

      return NextResponse.json({
        success: true,
        source: "local_memory",
        record: newRecord,
      });
    }

    return NextResponse.json(
      { error: "지원하지 않는 action입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error("API POST error:", error);
    return NextResponse.json(
      { error: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
