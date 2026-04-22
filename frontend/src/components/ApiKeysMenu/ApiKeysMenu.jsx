import { useState, useEffect, useRef } from 'react';

export function ApiKeysMenu( { apiKeys, setApiKeys, currentUser, connection, closeMenu } ) {
  const [dbKeys, setDbKeys] = useState({});
  const inputRefs = useRef({});

  useEffect(() => {
    async function fetchApiKeys() {
        try {
            const res = await connection.get("/apikeys");
            setDbKeys(res.data);
        } catch (e) {
            console.log(e);
        }
    }
    fetchApiKeys();
  }, [])

  async function saveKeyToDb(identifier) {
    const key = inputRefs.current[identifier]?.value;
    try {
      const res = await connection.post("/apikeys", {"identifier": identifier, "key": key});
      // if no exception is thrown, the flow was saved correctly
      setDbKeys({...dbKeys, [identifier]: 1});
        
    } catch (e) {
      console.log(e);
    }
  }

  async function deleteKeyFromDb(identifier) {
    try {
      const res = await connection.delete(`/apikeys/${identifier}`);
      // if no exception is thrown, the flow was deleted correctly
      setDbKeys({...dbKeys, [identifier]: 0});
    } catch (e) {
      console.log(e);
    }
  }
  
  return (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[5px]" onClick={closeMenu}>
              <div className="relative flex flex-col items-center gap-6 w-[70%] h-[50%] max-w-[900px] min-h-[200px] rounded-lg bg-white p-3 pt-6 shadow-md" 
              onClick={(e) => e.stopPropagation()}>
                  <button className="absolute top-3 right-3 bg-transparent border-none text-2xl cursor-pointer text-red-500 hover:text-red-700 transition-all duration-200" onClick={closeMenu}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                  </button>
                  <h1 className="ml-2 text-xl self-start">Your API Keys</h1>
                  <div className="flex flex-col gap-8">
                    {Object.entries(apiKeys).map(([key, value]) => {
                      return <form key={key} onSubmit={(e) => 
                        {
                          e.preventDefault();
                          const newKeys = {...apiKeys};
                          newKeys[key] = e.target[0].value;
                          setApiKeys(newKeys);
                        }
                      }>
                        <div className="flex items-center gap-4">
                          <label className="text-xl">{key}:</label>
                          {currentUser !== "" && (dbKeys[key] === 1 ? <p className="text-xs">in database</p> : <p className="text-xs">not in database</p>)}
                          <span className="flex items-center gap-3">
                            <textarea className="border border-gray-900 py-1 pl-3 h-10 min-h-10 rounded-md max-w-64" type="text" id="username" placeholder={`Your ${key} key here...`} defaultValue={value} ref={el => inputRefs.current[key] = el} />
                            <button type="submit" className="max-w-32 font-medium bg-[#65a064] hover:bg-[#79c278] text-white py-2 px-4 rounded-md transition-colors duration-200">Save locally</button>
                            {currentUser !== "" && (dbKeys[key] === 1 ? <button type='button' className="max-w-32 font-medium bg-[#ad5a5a] hover:bg-[#da756e] text-white py-2 px-4 rounded-md transition-colors duration-200" onClick={() => deleteKeyFromDb(key)}>Delete from database</button> : <button type='button' className="max-w-32 font-medium bg-[#65a064] hover:bg-[#79c278] text-white py-2 px-4 rounded-md transition-colors duration-200" onClick={() => saveKeyToDb(key)}>Save to database</button>)}
                          </span>
                        </div>
                      </form>
                    }) }
                </div>
              </div>
          </div>
      )
};
