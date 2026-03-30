import Login from "../widgets/Login"

export default function GridLayout() {
  return (
    <div className="grid h-full grid-cols-[362fr_558fr_558fr_362fr] gap-7">
      <div className="col-span-1">
        <Login />
      </div>
    </div>
  )
}
