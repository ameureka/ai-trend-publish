from openai import OpenAI
import requests
from urllib.parse import urljoin
import json

api_key = "AIzaSyB_ITMHNi0RlRtNb4Xyomq8EYuYgaZhGfc"
base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"

client = OpenAI(
  api_key=api_key,
  base_url=base_url
)

# 列出可用模型
print("=== 可用模型列表 ===")
models = client.models.list()
for model in models:
  print(model.id)

# 测试直接请求API（不使用OpenAI库）
print("\n=== 直接使用HTTP请求测试 ===")
try:
    # 构建请求URL
    chat_url = urljoin(base_url, "chat/completions")
    print(f"请求URL: {chat_url}")
    
    # 构建请求头和请求体
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    data = {
        "model": "models/gemini-2.0-flash",
        "messages": [
            {"role": "user", "content": "Hello, what are you capable of?"}
        ]
    }
    
    print(f"请求头: {headers}")
    print(f"请求体: {json.dumps(data, indent=2)}")
    
    # 发送请求
    response = requests.post(chat_url, headers=headers, json=data)
    
    # 打印完整响应
    print(f"状态码: {response.status_code}")
    print(f"响应体: {json.dumps(response.json(), indent=2)}")
    
except Exception as e:
    print(f"HTTP请求失败: {str(e)}")

# 注意：Gemini模型的名称格式与OpenAI不同，需要带有"models/"前缀
print("\n=== 使用OpenAI客户端测试聊天完成请求 ===")
try:
    chat_completion = client.chat.completions.create(
        # 完整的模型名称，必须包含"models/"前缀
        model="models/gemini-2.0-flash",
        messages=[
            {"role": "user", "content": "Hello, what are you capable of?"}
        ]
    )
    print("请求成功!")
    print(f"模型响应: {chat_completion.choices[0].message.content[:100]}...")
except Exception as e:
    print(f"请求失败: {str(e)}")

# 测试不同格式的模型名称
for model_name in ["gemini-2.0-flash", "models/gemini-2.0-flash"]:
    print(f"\n=== 测试模型名称: {model_name} ===")
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Say hi"}
            ]
        )
        print(f"使用 {model_name} 请求成功!")
    except Exception as e:
        print(f"使用 {model_name} 请求失败: {str(e)}")

# amureka@ameurekas-MacBook-Pro test % python googlegemini.py
# models/chat-bison-001
# models/text-bison-001
# models/embedding-gecko-001
# models/gemini-1.0-pro-vision-latest
# models/gemini-pro-vision
# models/gemini-1.5-pro-latest
# models/gemini-1.5-pro-001
# models/gemini-1.5-pro-002
# models/gemini-1.5-pro
# models/gemini-1.5-flash-latest
# models/gemini-1.5-flash-001
# models/gemini-1.5-flash-001-tuning
# models/gemini-1.5-flash
# models/gemini-1.5-flash-002
# models/gemini-1.5-flash-8b
# models/gemini-1.5-flash-8b-001
# models/gemini-1.5-flash-8b-latest
# models/gemini-1.5-flash-8b-exp-0827
# models/gemini-1.5-flash-8b-exp-0924
# models/gemini-2.0-flash-exp
# models/gemini-2.0-flash
# models/gemini-2.0-flash-001
# models/gemini-2.0-flash-exp-image-generation
# models/gemini-2.0-flash-lite-001
# models/gemini-2.0-flash-lite
# models/gemini-2.0-flash-lite-preview-02-05
# models/gemini-2.0-flash-lite-preview
# models/gemini-2.0-pro-exp
# models/gemini-2.0-pro-exp-02-05
# models/gemini-exp-1206
# models/gemini-2.0-flash-thinking-exp-01-21
# models/gemini-2.0-flash-thinking-exp
# models/gemini-2.0-flash-thinking-exp-1219
# models/learnlm-1.5-pro-experimental
# models/gemma-3-27b-it
# models/embedding-001
# models/text-embedding-004
# models/gemini-embedding-exp-03-07
# models/gemini-embedding-exp
# models/aqa
# models/imagen-3.0-generate-002
  