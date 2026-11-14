-- [RONIGUARD] Universal Luau Execution Loader
-- Platform Host: https://roniguard.wasmer.app

local _k = Script_key or (getgenv and getgenv().Script_key) or _G.Script_Key or _G.Script_key or (getfenv and getfenv().Script_key)
if not _k or tostring(_k):gsub("%s+", "") == "" then
    if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
        game:GetService("Players").LocalPlayer:Kick("[RONIGUARD] License key missing. Set Script_key = 'KEY' above loadstring.")
    else
        error("[RONIGUARD] License key missing! Set Script_key = 'KEY' before executing.", 0)
    end
    return
end

local _userKey = tostring(_k):gsub("^%s+", ""):gsub("%s+$", "")
local _baseUrl = "https://roniguard.wasmer.app"
local _scriptId = (getgenv and getgenv().Script_Id) or _G.Script_Id or "scr_main_default"
local _req = (syn and syn.request) or (http and http.request) or http_request or request
local _payload = nil

if _req then
    pcall(function()
        local _res = _req({
            Url = _baseUrl .. "/api/loader/raw/" .. _scriptId .. "?key=" .. _userKey,
            Method = "GET",
            Headers = {
                ["User-Agent"] = "RONIGUARD-Luau-Executor",
                ["X-License-Key"] = _userKey,
                ["X-Script-Id"] = _scriptId
            }
        })
        if _res and _res.Body and _res.StatusCode == 200 then
            _payload = _res.Body
        end
    end)
end

if not _payload or _payload == "" then
    pcall(function()
        _payload = game:HttpGet(_baseUrl .. "/api/loader/raw/" .. _scriptId .. "?key=" .. _userKey)
    end)
end

if not _payload or _payload == "" then
    if game and game:GetService("Players") and game:GetService("Players").LocalPlayer then
        game:GetService("Players").LocalPlayer:Kick("[RONIGUARD] Failed to load protected script payload. Verify key or connection.")
    else
        error("[RONIGUARD] Failed to load protected script payload.", 0)
    end
    return
end

local _loadFn, _compErr = (loadstring or load)(_payload)
if not _loadFn then
    error("[RONIGUARD] Payload execution error: " .. tostring(_compErr), 0)
end
_loadFn()
