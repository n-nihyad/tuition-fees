import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { store } from './app/store/store'
import AppRoutes from './app/router/AppRoutes'
import { LocaleProvider } from './shared/providers/LocaleProvider'
import { ApiError } from './shared/api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status === undefined || error.status >= 500),
    },
  },
})

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </LocaleProvider>
      </QueryClientProvider>
    </Provider>
  )
}
