import { useAuth } from "../context/AuthContext"
import Login from "../widgets/Login"
import Profile from "../widgets/Profile"
import Clock from "../widgets/Clock"
import Timer from "../widgets/Timer"
import Weather from "../widgets/Weather"
export default function GridLayout() {
  const { user, loading } = useAuth()

  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] grid-rows-[auto_1fr] gap-[1.5vw]">
      <div>
        {loading ? null : user ? <Profile /> : <Login />}
      </div>
      <div className="flex items-start gap-7">
        <Clock />
        
      </div>
      <Timer />
      <Weather />
    </div>
  )
}
