import { useState, useEffect } from "react"
import folderIcon from "../assets/folder.svg"
import { useAuth } from "../context/AuthContext"
import { fetchProfileRow } from "../api/settings"

const DEFAULT_FOLDER_NAMES = ["진행중인 업무", "나중에 볼 파일", "기타"]

export default function Folders() {
  const { user } = useAuth()
  const [names, setNames] = useState(DEFAULT_FOLDER_NAMES)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await fetchProfileRow(user.id)
      if (data?.folder_names && Array.isArray(data.folder_names) && data.folder_names.length > 0) {
        setNames(DEFAULT_FOLDER_NAMES.map((def, i) => data.folder_names[i] || def))
      }
    })()
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setNames(DEFAULT_FOLDER_NAMES.map((def, i) => e.detail[i] || def))
      }
    }
    window.addEventListener("folder-names-change", handler)
    return () => window.removeEventListener("folder-names-change", handler)
  }, [])

  return (
    <div className="bg-widjet rounded-2xl p-7 h-full grid grid-rows-3 gap-2">
      {names.map((name, i) => (
        <div key={i} className="flex flex-row items-start justify-start gap-2">
          <img src={folderIcon} alt="폴더" />
          <p className="text-[clamp(0.7rem,0.9vw,1.25rem)] font-semibold">{name}</p>
        </div>
      ))}
    </div>
  )
}