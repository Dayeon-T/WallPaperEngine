import { Routes, Route } from 'react-router'
import GridLayout from "./layouts/GridLayout"
import SignIn from "./pages/SignIn"
import SignUp from "./pages/SignUp"
import FindId from "./pages/FindId"
import FindPassword from "./pages/FindPassword"

function App() {
  return (
    <div className="fixed inset-0 bg-bg text-text mx-7 my-7">
      <Routes>
        <Route path="/" element={<GridLayout />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/find-id" element={<FindId />} />
        <Route path="/find-password" element={<FindPassword />} />
      </Routes>
    </div>
  )
}

export default App
