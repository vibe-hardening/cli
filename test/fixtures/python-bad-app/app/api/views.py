import subprocess
import os
import yaml
from fastapi import FastAPI
from django.views.decorators.csrf import csrf_exempt

app = FastAPI()


@app.get("/users/{user_id}")
def get_user(user_id: int):
    # SQL injection via f-string
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
    return {"ok": True}


@app.post("/run")
def run_command(cmd: str):
    # RCE via shell=True
    subprocess.run(cmd, shell=True)
    return {"ok": True}


@csrf_exempt
def legacy_view(request):
    os.system("echo " + request.GET.get("msg"))
    return yaml.load(request.body)
