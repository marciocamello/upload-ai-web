import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

interface PromptSelectProps {
  onPromptSelected: (template: string) => void
}

interface Prompt {
  id: string
  title: string
  template: string
}

export function PromptSelect(props: PromptSelectProps){
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)

  async function getPrompts(){
    await api.get('/prompts').then(response => {
      setPrompts(response.data)
    })
  }

  useEffect(() => {
    getPrompts()
  }, [])

  function handlePromptSelected(promptId: string){
    const selectedPrompt = prompts?.find(prompt => prompt.id === promptId)

    if(!selectedPrompt){
      return
    }

    props.onPromptSelected(selectedPrompt.template)
  }

  return (
    <Select onValueChange={handlePromptSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um prompt..."/>
      </SelectTrigger>
      <SelectContent>
        {prompts?.map(prompt => (
          <SelectItem 
            key={prompt.id}
            value={prompt.id}
          >
            {prompt.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}