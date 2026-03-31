import { useAuth } from "../context/AuthContext"
import Login from "../widgets/Login"
import Profile from "../widgets/Profile"
import Clock from "../widgets/Clock"

export default function GridLayout() {
  const { user, loading } = useAuth()

  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] gap-7">
      <div className="col-span-1">
        {loading ? null : user ? <Profile /> : <Login />}
      </div>
      <div className="col-span-1">
        <Clock />
      </div>
    </div>
  )
}
