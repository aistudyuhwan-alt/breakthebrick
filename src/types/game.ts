// Google Sheets 및 순위 기록 타입 정의

export interface GameRecord {
  id?: string;
  name: string;
  completionTime: string;      // "MM:SS"
  completionTimeSeconds: number; // 정렬용 초 단위 숫자 (예: 65.4)
  createdAt: string;           // "YYYY-MM-DD HH:mm:ss"
}

export interface CreatorInfo {
  department: string;
  studentId: string;
  name: string;
}
