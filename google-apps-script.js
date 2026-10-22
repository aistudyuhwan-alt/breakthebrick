/**
 * Google Apps Script (GAS) - INU 벽돌깨기 스프레드시트 연동 스크립트
 * 
 * 스프레드시트: https://docs.google.com/spreadsheets/d/1MANR_JZPZBBLlFYqXt9qANNu9dl4NethJx8aa5XbfUk/edit?usp=sharing
 * 
 * 시트 헤더 (1행):
 * A열: timestamp | B열: name | C열: finishtime
 */

const SHEET_ID = "1MANR_JZPZBBLlFYqXt9qANNu9dl4NethJx8aa5XbfUk";

function getTargetSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getActiveSheet();
}

// 구글 시트 날짜 객체 또는 문자열로부터 정규 "MM:SS" 및 초 단위 계산
function parseFinishtime(val) {
  if (!val) return { display: "00:00", seconds: 999999 };

  // Date 객체로 자동 변환된 경우 (구글 시트가 00:22를 시분초로 인식 시)
  if (val instanceof Date) {
    const minutes = val.getMinutes();
    const seconds = val.getSeconds();
    const formatted = Utilities.formatString("%02d:%02d", minutes, seconds);
    return { display: formatted, seconds: minutes * 60 + seconds };
  }

  // 문자열인 경우 ("00:22")
  const str = String(val).trim();
  if (str.indexOf(":") !== -1) {
    const parts = str.split(":");
    const min = parseFloat(parts[0]) || 0;
    const sec = parseFloat(parts[1]) || 0;
    const formatted = Utilities.formatString("%02d:%02d", Math.floor(min), Math.floor(sec));
    return { display: formatted, seconds: min * 60 + sec };
  }

  const num = parseFloat(str) || 999999;
  return { display: String(val), seconds: num };
}

// 날짜 포맷 정리
function formatTimestamp(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  }
  return String(val);
}

// ============================================================
// 1. GET: 기록 조회 및 종료시간 오름차순 순위(Rank) 매기기
// ============================================================
function doGet(e) {
  try {
    const sheet = getTargetSheet();
    const rows = sheet.getDataRange().getValues();

    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rawTimestamp = row[0];
      const rawName = row[1];
      const rawFinishtime = row[2];

      if (!rawName && !rawFinishtime) continue;

      const timeInfo = parseFinishtime(rawFinishtime);

      records.push({
        rowIndex: i + 1,
        timestamp: formatTimestamp(rawTimestamp),
        name: String(rawName || "").trim(),
        finishtime: timeInfo.display,
        completionTime: timeInfo.display,
        completionTimeSeconds: timeInfo.seconds
      });
    }

    // 종료시간 오름차순 정렬 (가장 빠른 순서)
    records.sort(function (a, b) {
      return a.completionTimeSeconds - b.completionTimeSeconds;
    });

    for (let r = 0; r < records.length; r++) {
      records[r].rank = r + 1;
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      totalCount: records.length,
      data: records
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 2. POST: Create, Update, Delete 수행
// ============================================================
function doPost(e) {
  try {
    const sheet = getTargetSheet();
    let data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    const action = (data.action || "create").toLowerCase();

    // [CREATE] 새 기록 등록
    if (action === "create" || !data.action) {
      const timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
      const name = data.name || "익명";
      // 작은따옴표(')를 붙여 시트에서 문자열로 강제 보존 (날짜 변환 방지)
      const finishtime = data.finishtime || data.completionTime || "00:00";
      const sheetFinishtime = "'" + String(finishtime).replace(/^'/, "");

      sheet.appendRow([timestamp, name, sheetFinishtime]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: "create",
        message: "새 기록이 성공적으로 등록되었습니다.",
        record: {
          timestamp: timestamp,
          name: name,
          finishtime: finishtime
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // [UPDATE]
    if (action === "update") {
      const rows = sheet.getDataRange().getValues();
      let targetRow = -1;

      if (data.rowIndex && Number(data.rowIndex) > 1 && Number(data.rowIndex) <= rows.length) {
        targetRow = Number(data.rowIndex);
      }

      if (targetRow === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "수정할 대상 행(row)을 찾을 수 없습니다."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (data.name !== undefined) sheet.getRange(targetRow, 2).setValue(data.name);
      if (data.finishtime !== undefined) sheet.getRange(targetRow, 3).setValue("'" + data.finishtime);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: "update",
        updatedRow: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // [DELETE]
    if (action === "delete") {
      const rows = sheet.getDataRange().getValues();
      let targetRow = -1;

      if (data.rowIndex && Number(data.rowIndex) > 1 && Number(data.rowIndex) <= rows.length) {
        targetRow = Number(data.rowIndex);
      }

      if (targetRow === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "삭제할 대상 행(row)을 찾을 수 없습니다."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      sheet.deleteRow(targetRow);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: "delete",
        deletedRow: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "알 수 없는 action"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
