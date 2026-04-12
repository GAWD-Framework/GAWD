import asyncio
from pymongo import AsyncMongoClient
from pydantic import BaseModel
from typing import List, Dict
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

        

client = AsyncMongoClient("mongodb://localhost:27017/")
db = client.agent_builder
collection = db.get_collection("users")

class KeyVault():
    def __init__(self):
        self.key = os.getenv("SECRET_KEY_APIKEYS") # used for symmetric encryption of stored apikeys
        self.cipher = Fernet(self.key)

    def encrypt(self, raw_str: str) -> str:
        return self.cipher.encrypt(raw_str.encode()).decode() # encode turns string to bytes, decode turns bytes to string

    def decrypt(self, enc_str: str) -> str:
        return self.cipher.decrypt(enc_str.encode()).decode()

key_vault = KeyVault()

async def create_user(username, password):
    user = {"username": username, "password": password, "flows": {}, "api_keys": {}}
    result = await collection.insert_one(user)
    return result.inserted_id

async def get_user(username):
    user = await collection.find_one({"username": username}) # user = None if no matches
    return user 

async def add_flow(username, flow_name, flow_data):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    if flow_name in user["flows"]:
        raise Exception("Flow already exists")
    
    user["flows"][flow_name] = flow_data
    await collection.replace_one({"username": username}, user)

async def update_flow(username, flow_name, flow_data):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    if flow_name not in user["flows"]:
        raise Exception("Flow not found")
    
    user["flows"][flow_name] = flow_data
    await collection.replace_one({"username": username}, user)

async def delete_flow(username, flow_name):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    if flow_name not in user["flows"]:
        raise Exception("Flow not found")
    
    del user["flows"][flow_name]
    await collection.replace_one({"username": username}, user)

async def get_flow(username, flow_name):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    if flow_name not in user["flows"]:
        raise Exception("Flow not found")
    
    return user["flows"][flow_name]

async def get_flow_names(username):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    return list(user["flows"].keys())

async def add_api_key(username, key, value):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    user["api_keys"][key] = key_vault.encrypt(value)
    await collection.replace_one({"username": username}, user)

async def delete_api_key(username, key):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    if key not in user["api_keys"]:
        raise Exception("API key not found")
    
    del user["api_keys"][key]
    await collection.replace_one({"username": username}, user)

async def get_api_keys(username):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    decrypted_keys = {}
    for key, value in user["api_keys"].items():
        decrypted_keys[key] = key_vault.decrypt(value)
    return decrypted_keys

async def get_api_keys_presence(username):
    user = await get_user(username)
    if user is None:
        raise Exception("User not found")
    
    presence = {}
    
    for api_key in user["api_keys"]:
        presence[api_key] = 1
    
    return presence


async def test():
    try:
        await client.admin.command("ping")

        print("Connected successfully")
        clients = await collection.find().to_list(length=None)
        print(clients)

        # other application code

        await client.close()

    except Exception as e:

        raise Exception(

            "The following error occurred: ", e)

if __name__ == "__main__":
    asyncio.run(test())