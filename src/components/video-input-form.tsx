import {  useMemo, useRef, useState } from "react";
import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

interface VideoInputFormProps {
  onVideoUploaded: (videoId: string) => void
}

type StatusCode = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success' | 'error'

type Status = {
  code: StatusCode
  message: string
}

const defaultStatus: Status = {
  code : 'waiting',
  message: 'Carregar vídeo'
}

export function VideoInputForm(props: VideoInputFormProps){

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>(defaultStatus)
  const [progress, setProgress] = useState(0)

  const formRef = useRef<HTMLFormElement>(null)
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>){
    const { files } = event.currentTarget

    if(!files) {
      return
    }

    const selectedFile = files[0]
    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File){
    console.log('Convert started')

    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    //ffmpeg.on('log', (message) => console.log(message))

    ffmpeg.on('progress', (progress) => {
      const total = Math.round(progress.progress * 100)
      if(total > 100) return
      console.log('Convert progress:' + total + '%')
      setProgress(total)
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20K',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audiioFile = new File([audioFileBlob], 'audio.mp3', { 
      type: 'audio/mpeg' 
    })

    console.log('Convert finished')

    return audiioFile
  }

  async function handleUploadVideo  (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if(!videoFile){
      return
    }

    setStatus({
      code: 'converting',
      message: 'Convertendo... '
    })

    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus({
      code: 'uploading',
      message: 'Enviando...'
    })

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus({
      code: 'generating',
      message: 'Gerando transcrição...'
    })

    await api.post(`/videos/${videoId}/transcription`, {
      prompt
    })

    setStatus({
      code: 'success',
      message: 'Sucesso!'
    })

    setTimeout(() => {
      setStatus(defaultStatus)
      setVideoFile(null)
      setProgress(0)
      formRef.current?.reset()
    }, 2000)

    props.onVideoUploaded(videoId)
  }

  const previewUrl = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  },[videoFile])

  return (
    <form 
      ref={formRef}
      onSubmit={handleUploadVideo} 
      className="space-y-6"
    >
          <label 
            htmlFor="video"
            className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
          >
            {previewUrl ? (
              <video 
                src={previewUrl} 
                className="pointer-events-none absolute inset-0" 
                controls={false}
              /> 
            ) : (
              <>
                <FileVideo className="w-4 h-4"/>
                Selecione um vídeo
              </>
            )}
          </label>

          <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected}/>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
            <Textarea 
              ref={promptInputRef}
              disabled={status.code !== 'waiting' && status.code !== 'success'}
              id="transcription_prompt" 
              className="h-20 leading-relaxed resize-none"
              placeholder="Inclua palavras-chave mencionada no vídeo separadas por vírgula (,)"
            />
          </div>

          <Button 
            data-success={status.code === 'success'}
            disabled={status.code !== 'waiting' && status.code !== 'success'}
            className="w-full data-[success=true]:bg-emerald-400" 
            type="submit"
          >
            {
              (status.code === 'waiting') ? (
                <>
                  {status.message}
                  <Upload className="w-4 h-4 ml-2"/>
                </>
              ) : (
                status.code === 'converting' && progress ? (
                  <>
                    {status.message + (progress > 0 && `${progress}%`)}
                  </>
                ) : (
                  status.message
                )
              )
            }
          </Button>
        </form>
  )
}

// + (progress > 0 && `(${progress}%)`)