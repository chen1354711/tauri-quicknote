import type { SystemInfo } from "../types";

const OS_LABEL: Record<string, string> = {
  darwin: "macOS",
  win32: "Windows",
  linux: "Linux",
};

const ARCH_LABEL: Record<string, string> = {
  aarch64: "Apple Silicon",
  x86_64: "Intel x86_64",
  arm: "ARM",
};

export function InfoCards({ info }: { info: SystemInfo | null }) {
  const cards = [
    { label: "系统", value: info ? (OS_LABEL[info.os] ?? info.os) : "—" },
    { label: "架构", value: info ? (ARCH_LABEL[info.arch] ?? info.arch) : "—" },
    { label: "应用版本", value: info ? `v${info.appVersion}` : "—" },
    { label: "Tauri", value: info?.tauriVersion ?? "—" },
  ];

  return (
    <section className="info-grid" aria-label="运行时信息">
      {cards.map((card) => (
        <div className="info-card" key={card.label}>
          <span className="info-label">{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </section>
  );
}
