import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'
import { AppProviders } from './app/providers'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
