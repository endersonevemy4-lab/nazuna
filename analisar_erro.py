import os
import requests
import json

api_key = os.getenv("GEMINI_KEY")
issue_title = os.getenv("ISSUE_TITLE", "")
issue_body = os.getenv("ISSUE_BODY", "")

prompt_texto = f"""
Você é um assistente programador especializado em JavaScript e Node.js para bots de WhatsApp.
O usuário abriu uma tarefa (Issue) com o título '{issue_title}' e a descrição '{issue_body}'.

Examine os arquivos deste repositório e aplique a alteração pedida.
Se for solicitado para remover um comando inteiro (como o menulogos), localize o arquivo .js correspondente e delete-o ou limpe o código de dentro do index.js.

Retorne a resposta EXCLUSIVAMENTE no formato JSON estruturado, sem blocos de texto markdown antes ou depois. Use a seguinte estrutura:
{{
  "arquivos_modificados": {{
    "caminho/do/arquivo.js": "conteúdo completo do arquivo atualizado aqui se houver modificação"
  }},
  "arquivos_deletados": [
    "caminho/do/arquivo_para_deletar.js"
  ]
}}
"""

url = f"https://googleapis.com{api_key}"
payload = {
    "contents": [{"parts": [{"text": prompt_texto}]}],
    "generationConfig": {"responseMimeType": "application/json"}
}

try:
    response = requests.post(url, json=payload)
    result = response.json()
    text_response = result['candidates']['content']['parts']['text']
    dados_ia = json.loads(text_response)
    
    if "arquivos_deletados" in dados_ia:
        for arquivo in dados_ia["arquivos_deletados"]:
            if os.path.exists(arquivo):
                os.remove(arquivo)
                print(f"Arquivo deletado: {arquivo}")
                
    if "arquivos_modificados" in dados_ia:
        for arquivo, conteudo in dados_ia["arquivos_modificados"].items():
            os.makedirs(os.path.dirname(arquivo), exist_ok=True)
            with open(arquivo, "w", encoding="utf-8") as f:
                f.write(conteudo)
            print(f"Arquivo atualizado: {arquivo}")
            
    print("IA analisou o erro e aplicou as modificações no código com sucesso.")
except Exception as e:
    print(f"Erro ao processar resposta da IA: {e}")
