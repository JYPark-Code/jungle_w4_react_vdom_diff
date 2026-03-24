// [왜] Hooks 모듈
// useState를 fiber.js에서 분리하면 순환 참조가 생길 수 있어서
// 여기서 한 곳에서 내보내고, 필요한 곳에서 가져다 써요
//
// 지금은 useState만 있지만, 나중에 useEffect 같은 훅도 여기에 추가해요

export { useState, setCurrentFiber } from './fiber.js'
