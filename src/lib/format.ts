/** 把毫秒时间戳格式化成“刚刚 / N 分钟前 …” */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;

  return new Date(ms).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}
