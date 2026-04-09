/**
 * 이진 탐색으로 scrollTop에 해당하는 첫 번째 가시 노드 인덱스를 찾는다.
 *
 * nodePositions[i]는 i번째 아이템의 top 위치 (누적합 배열).
 * 노드의 중앙점(nodeCenter)과 scrollTop을 비교하여
 * 현재 뷰포트 최상단에 위치한 노드를 O(log n)으로 찾는다.
 *
 * @param scrollTop - 현재 스크롤 위치
 * @param nodePositions - 누적 위치 배열 (길이: itemCount + 1)
 * @param itemCount - 전체 아이템 수
 * @returns 첫 번째 가시 노드의 인덱스
 */
export function generateStartNodeIndex(
  scrollTop: number,
  nodePositions: number[],
  itemCount: number,
): number {
  let startRange = 0;
  let endRange = itemCount - 1;

  if (endRange < 0) return 0;
  if (scrollTop <= 0) return 0;

  while (endRange !== startRange) {
    const middle = Math.floor((endRange - startRange) / 2 + startRange);
    const nodeCenter =
      (nodePositions[middle] + nodePositions[middle + 1]) / 2;

    if (nodeCenter <= scrollTop && nodePositions[middle + 1] > scrollTop) {
      return middle;
    }

    if (middle === startRange) {
      return endRange;
    }

    if (nodeCenter <= scrollTop) {
      startRange = middle;
    } else {
      endRange = middle;
    }
  }

  return startRange;
}

/**
 * 이진 탐색으로 뷰포트를 넘어서는 마지막 가시 노드 인덱스를 찾는다.
 *
 * 기존 구현은 선형 탐색 O(k)였으나, 이진 탐색 O(log n)으로 개선.
 * startNodeIndex의 다음 노드 위치를 기준으로 viewportHeight를 더한
 * 경계값을 초과하는 첫 번째 노드를 찾는다.
 *
 * @param nodePositions - 누적 위치 배열
 * @param startNodeIndex - 첫 번째 가시 노드 인덱스 (renderAhead 미적용)
 * @param itemCount - 전체 아이템 수
 * @param viewportHeight - 뷰포트 높이
 * @returns 마지막 가시 노드의 인덱스
 */
export function generateEndNodeIndex(
  nodePositions: number[],
  startNodeIndex: number,
  itemCount: number,
  viewportHeight: number,
): number {
  if (itemCount === 0) return 0;

  const basePosition = nodePositions[startNodeIndex + 1] ?? nodePositions[startNodeIndex];
  const targetPosition = basePosition + viewportHeight;

  let low = startNodeIndex;
  let high = itemCount - 1;

  // 마지막 아이템도 뷰포트 안이면 바로 반환
  if (nodePositions[high] <= targetPosition) {
    return high;
  }

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (nodePositions[mid] <= targetPosition) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * 이진 탐색으로 타겟 아이템을 뷰포트 중앙에 배치하기 위한 시작 노드 인덱스를 찾는다.
 *
 * 타겟 아이템의 중심이 뷰포트 중앙(viewportHeight / 2)에 오도록 하는
 * scrollTop 위치의 첫 번째 가시 노드를 찾는다.
 *
 * @param nodePositions - 누적 위치 배열
 * @param targetRowHeight - 타겟 아이템의 높이
 * @param targetRowIndex - 타겟 아이템의 인덱스
 * @param viewportHeight - 뷰포트 높이
 * @returns 시작 노드 인덱스
 */
export function generateCenteredStartNodeIndex(
  nodePositions: number[],
  targetRowHeight: number,
  targetRowIndex: number,
  viewportHeight: number,
): number {
  if (!nodePositions || nodePositions.length === 0) return 0;

  const totalHeight = nodePositions[targetRowIndex] + targetRowHeight;
  if (totalHeight <= viewportHeight) return 0;

  const viewHalf = Math.floor(viewportHeight / 2);

  let start = 0;
  let end = targetRowIndex;
  let answer = 0;
  let closestDistance = Infinity;

  while (start <= end) {
    const middle = Math.floor((end - start) / 2 + start);
    const middleHeight =
      nodePositions[targetRowIndex] - nodePositions[middle] + targetRowHeight;

    const distance = Math.abs(middleHeight - viewHalf);
    if (distance < closestDistance) {
      closestDistance = distance;
      answer = middle;
    }

    if (viewHalf < middleHeight) {
      start = middle + 1;
    } else {
      end = middle - 1;
    }
  }

  return answer;
}
