import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/i18n'  // must be before App
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { isLineInAppBrowser } from './lib/line-browser'
import { onLogout } from './stores/authStore'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection (Gate 4)
      refetchOnWindowFocus: false,
    },
  },
})

// Dọn dẹp toàn bộ TanStack Query cache khi người dùng đăng xuất để tránh rò rỉ dữ liệu phiên
onLogout(() => {
  queryClient.clear()
})

// LIFF Endpoint URL đang là root '/' nên LINE thả callback về '/?liff.state=/liff&code=...'.
// LiffEntryPage chỉ mount ở route '/liff' -> liff.init() không chạy ở root, 'code' không được
// xử lý, app render HomePage. Chuyển sớm sang '/liff' giữ nguyên query để liff.init() tiêu thụ
// 'code'. Kích hoạt khi có key đặc trưng của LIFF hoặc mở trong LINE In-App Browser.
const liffSearch = window.location.search
const isLiffRootCallback =
  window.location.pathname === '/' &&
  (/[?&](redirect|liff\.state|liffClientId)=/.test(liffSearch) || isLineInAppBrowser())

if (isLiffRootCallback) {
  window.location.replace('/liff' + liffSearch + window.location.hash)
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}
