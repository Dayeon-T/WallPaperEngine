import folderIcon from "../assets/folder.svg"

export default function Folders() {
  return (
    <div className="bg-widjet rounded-2xl p-7 h-full grid grid-rows-3 gap-2">

  <div className="flex flex-row items-start justify-start gap-2">
      <img src={folderIcon} alt="폴더" />
      <p className="text-[clamp(0.7rem,0.9vw,1.25rem)] font-semibold">진행중인 업무</p>
    </div>
    <div className="flex flex-row items-start justify-start gap-2">
      <img src={folderIcon} alt="폴더" />
      <p className="text-[clamp(0.7rem,0.9vw,1.25rem)] font-semibold">나중에 볼 파일</p>
    </div>
    <div className="flex flex-row items-start justify-start gap-2">
      <img src={folderIcon} alt="폴더" />
      <p className="text-[clamp(0.7rem,0.9vw,1.25rem)] font-semibold">기타</p>
    </div>

    </div>
    
  )
}