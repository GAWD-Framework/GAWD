from enum import Enum
from typing import Annotated
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import sys
import importlib.util
from pwdlib import PasswordHash
import jwt
from jwt.exceptions import InvalidTokenError
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import os

from generators.crew.crewai_generator import generate_code as crewai_generate_code
from generators.pydantic.pydantic_generator import generate_code as pydantic_generate_code

from validators.crewai_validator import validate_flow as crewai_validate_flow
from validators.pydantic_validator import validate_flow as pydantic_validate_flow

import db

class NewUser(BaseModel):
    username: str
    password: str

class FlowNodes(BaseModel):
    nodes: list[dict]

class ApiKey(BaseModel):
    identifier: str
    key: str

class ExecutionData(BaseModel):
    flow_data: FlowNodes
    api_keys: dict[str, str]

class FrameworkName(str, Enum):
    CrewAI = "crewai"
    PydanticAI = "pydanticai"

class FlowData(BaseModel):
    data: dict

class Token(BaseModel):
    access_token: str
    token_type: str

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") # path the clients should use to get a token

password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummypassword")

load_dotenv()
SECRET_KEY_TOKENS = os.getenv("SECRET_KEY_TOKENS") # used for signing jwt tokens
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,         # Allow specific origins
    allow_credentials=True,        # Allow cookies/auth headers
    allow_methods=["*"],           # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],           # Allow all headers
)

def load_module(source, module_name=None):
    """
    reads file source and loads it as a module

    :param source: file to load
    :param module_name: name of module to register in sys.modules
    :return: loaded module
    """

    if module_name is None:
        module_name = "new_module"

    spec = importlib.util.spec_from_file_location(module_name, source)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)

    return module

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY_TOKENS, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_username(token: Annotated[str, Depends(oauth2_scheme)]): # helper function to use as dependency. Extracts username from the database based on the token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY_TOKENS, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    
    user = await db.get_user(username)
    if user is None:
        raise credentials_exception
    
    return user["username"]

@app.post("/generate/{framework}")
def generate_code(framework: FrameworkName, execution_data: ExecutionData):
    """
    Takes a JSON representation of a worflow and generates the corresponding code for a given framework.
    """
    if framework == FrameworkName.CrewAI:
        crewai_generate_code(execution_data.flow_data.nodes, execution_data.api_keys, "../generated_code", "test_script.py")
        return {"message:": "Generating code for CrewAI..."}
    elif framework == FrameworkName.PydanticAI:
        pydantic_generate_code(execution_data.flow_data.nodes, execution_data.api_keys, "../generated_code", "test_script.py")
        return {"message": "Generating code for PydanticAI..."}
    # if framework is not in the FrameworkName enum, FastAPI automatically returns error 404 
    
@app.put("/users")
async def create_user(user: NewUser):
    if await db.get_user(user.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")
    
    await db.create_user(user.username, password_hash.hash(user.password))
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")

@app.post("/login")
async def login(data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user_in_db = await db.get_user(data.username)
    if user_in_db is None:
        password_hash.verify(data.password, DUMMY_HASH) # to prevent timing attacks
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown username", headers={"WWW-Authenticate": "Bearer"})
    if not password_hash.verify(data.password, user_in_db["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password", headers={"WWW-Authenticate": "Bearer"})
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_in_db["username"]}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")

@app.get("/flows")
async def get_flows(username: Annotated[str, Depends(get_current_user_username)]):
    return await db.get_flow_names(username);

@app.get("/flows/{flow_name}")
async def get_flow(flow_name: str, username: Annotated[str, Depends(get_current_user_username)]):
    return await db.get_flow(username, flow_name)

@app.post("/flows/{flow_name}")
async def save_flow(flow_name: str, flow: FlowData, username: Annotated[str, Depends(get_current_user_username)]):
    # error will be returned if no valid token is passed
    await db.add_flow(username, flow_name, flow.data)
    return {"message": "Flow saved"}

@app.patch("/flows/{flow_name}")
async def update_flow(flow: FlowData, flow_name: str, username: Annotated[str, Depends(get_current_user_username)]):
    await db.update_flow(username, flow_name, flow.data)
    return {"message": "Flow updated"}

@app.delete("/flows/{flow_name}")
async def delete_flow(flow_name: str, username: Annotated[str, Depends(get_current_user_username)]):
    await db.delete_flow(username, flow_name)
    return {"message": "Flow deleted"}

@app.post("/apikeys")
async def save_apikey(api_key: ApiKey, username: Annotated[str, Depends(get_current_user_username)]):
    await db.add_api_key(username, api_key.identifier, api_key.key)
    return {"message": "Key saved"}

@app.delete("/apikeys/{identifier}")
async def delete_apikey(identifier: str, username: Annotated[str, Depends(get_current_user_username)]):
    await db.delete_api_key(username, identifier)
    return {"message": "Key deleted"}

@app.get("/apikeys")
async def get_apikeys(username: Annotated[str, Depends(get_current_user_username)]):
    return await db.get_api_keys_presence(username)

@app.post("/validate/{framework}")
async def validate_code(framework: FrameworkName, flow_data: FlowData):
    # if framework is not in the FrameworkName enum, FastAPI automatically returns error 404
    if framework == FrameworkName.CrewAI:
        try:
            crewai_validate_flow(flow_data.data['nodes'], flow_data.data['edges'])
            return {"message": "Valid code for CrewAI"}
        except Exception as e:
            return {"message": str(e)}
    elif framework == FrameworkName.PydanticAI:
        try:
            crewai_validate_flow(flow_data.data['nodes'], flow_data.data['edges'])
            return {"message": "Valid code for PydanticAI"}
        except Exception as e:
            return {"message": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str = None):

    async def print_function(to_send : str):
        await websocket.send_json({"msg_type": "info", "msg_content": to_send})

    async def input_function(prompt : str):
        await websocket.send_json({"msg_type": "prompt", "msg_content": prompt})
        rec = await websocket.receive_text()
        await websocket.send_json({"msg_type:": "info", "msg_content": f">{rec}"})
        return rec
    
    await websocket.accept()
    try:
        # receive framework and flow information
        data = await websocket.receive_json()
        framework = data['framework']
        if framework == FrameworkName.CrewAI:
            await websocket.send_json({"msg_type": "info", "msg_content": "Generating code for CrewAI..."})
        elif framework == FrameworkName.PydanticAI:
            await websocket.send_json({"msg_type": "info", "msg_content": "Generating code for PydanticAI..."})
        else:
            await websocket.send_json({"msg_type": "error", "msg_content": "Unknown framework"})
            return
        nodes = data['nodes']
        edges = data['edges']
        api_keys = data['api_keys']

        # validate the flow data
        try:
            if framework == FrameworkName.CrewAI:
                warnings = crewai_validate_flow(nodes, edges)
            elif framework == FrameworkName.PydanticAI:
                warnings = pydantic_validate_flow(nodes, edges)
        except Exception as e:
            await websocket.send_json({"msg_type": "error", "msg_content": "Error validating flow: " + str(e)})
            return
        if len(warnings) > 0:
            for warning in warnings:
                await websocket.send_json({"msg_type": "warning", "msg_content": warning})

        # if a logged in user has stored API keys in the database, use them for the fields that were not provided
        if username is not None:
            stored_api_keys = await db.get_api_keys(username)
            for key in stored_api_keys:
                if key not in api_keys or api_keys[key] == "":
                    api_keys[key] = stored_api_keys[key]
        
        # generate code and imports it
        try: 
            generate_code(framework, ExecutionData(flow_data=FlowNodes(nodes=nodes), api_keys=api_keys))
        except Exception as e: 
            await websocket.send_text("Error generating code: " + e)
            return
        #generate_code(framework, ExecutionData(flow_data=FlowNodes(nodes=nodes), api_keys=api_keys))
        
        created_module = load_module("../generated_code/test_script.py", "test_script")

        # run the generated code
        try: 
            result = await created_module.run_workflow(print_function, input_function)
            await websocket.send_json({"msg_type": "info", "msg_content": f"Execution complete. Script output: {result}"})
        except Exception as e: 
            await websocket.send_json({"msg_type": "error", "msg_content": "Error running script: " + str(e)})

    except WebSocketDisconnect:
        print("Client disconnected")