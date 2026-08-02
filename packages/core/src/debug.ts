/**
 * 디버그 로그 — **기본은 꺼져 있다.**
 *
 * 라이브러리는 쓰는 쪽 콘솔에 함부로 찍으면 안 된다. 그 콘솔은 그쪽 것이고,
 * 아이템마다 한 줄씩 찍히면 채팅처럼 항목이 많은 화면에서는 콘솔이 로그로 덮이고
 * 개발자 도구를 연 채로는 눈에 띄게 느려진다.
 *
 * 그렇다고 지워버리면 이 라이브러리를 고칠 때 쓰던 관찰 수단이 사라진다.
 * 그래서 스위치를 단다 — 필요할 때만 켠다.
 *
 * ```ts
 * import { setDebug } from "@dynamic-scroll/core";
 * setDebug(true);
 * ```
 */

let enabled = false;

/** 디버그 로그를 켜고 끈다. 기본값은 false. */
export function setDebug(on: boolean): void {
  enabled = on;
}

/**
 * 로그 인자를 만드는 비용이 있을 때 이걸로 먼저 걸러라.
 * (예: InitialMeasure 가 로그를 찍으려고 img 를 전부 훑던 것)
 */
export function isDebugEnabled(): boolean {
  return enabled;
}

export function debugLog(...args: unknown[]): void {
  if (enabled) console.log(...args);
}
