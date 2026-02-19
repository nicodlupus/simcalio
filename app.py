from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable static file caching

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are SimCal, a friendly nutritionist assistant. Your job is to extract nutritional information from food descriptions provided by users.
When a user tells you what they ate or plan to eat, you must:
1. Respond in a conversational, encouraging tone
2. Extract ALL nutritional data from the food mentioned
3. Return a JSON object embedded in your response
ALWAYS include a JSON block in this exact format wrapped in <NUTRITION_DATA> tags:
<NUTRITION_DATA>
{
  "foods": [
    {
      "name": "Food name",
      "amount": "amount with unit",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "sugar_g": 0,
      "sodium_mg": 0,
      "potassium_mg": 0,
      "calcium_mg": 0,
      "iron_mg": 0,
      "magnesium_mg": 0,
      "vitamin_c_mg": 0,
      "vitamin_d_mcg": 0,
      "vitamin_b12_mcg": 0,
      "water_ml": 0
    }
  ],
  "totals": {
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0,
    "fiber_g": 0,
    "sugar_g": 0,
    "sodium_mg": 0,
    "potassium_mg": 0,
    "calcium_mg": 0,
    "iron_mg": 0,
    "magnesium_mg": 0,
    "vitamin_c_mg": 0,
    "vitamin_d_mcg": 0,
    "vitamin_b12_mcg": 0,
    "water_ml": 0
  }
}
</NUTRITION_DATA>
Use realistic nutritional values. If amounts are not specified, assume a standard serving size. Be encouraging and supportive."""


@app.route('/')
def index():
    return render_template('login.html')


@app.route('/chat')
def chat():
    return render_template('chat.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.json
    messages = data.get('messages', [])

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + messages,
            temperature=0.7
        )

        content = response.choices[0].message.content

        nutrition_data = None
        if '<NUTRITION_DATA>' in content and '</NUTRITION_DATA>' in content:
            start = content.index('<NUTRITION_DATA>') + len('<NUTRITION_DATA>')
            end = content.index('</NUTRITION_DATA>')
            json_str = content[start:end].strip()
            try:
                nutrition_data = json.loads(json_str)
            except json.JSONDecodeError:
                nutrition_data = None
            clean_content = (
                content[:content.index('<NUTRITION_DATA>')].strip()
                + content[content.index('</NUTRITION_DATA>') + len('</NUTRITION_DATA>'):].strip()
            )
        else:
            clean_content = content

        return jsonify({
            'message': clean_content,
            'nutrition_data': nutrition_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
