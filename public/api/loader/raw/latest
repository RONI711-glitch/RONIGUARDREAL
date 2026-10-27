--[[
  =============================================================
  🛑 UNAUTHORIZED ACCESS 🛑
  Content is not visible here.
  Please visit the official dashboard: https://roniguardreal.wasmer.app
  =============================================================
  RONIGUARD × AIDENFUSCATORS REGISTER VM v1.5 UNIVERSAL LOADER
  Compatible Executors: Synapse X, Wave, Delta, Fluxus, Codex, Arceus X, Hydrogen
  Roblox Execution Syntax:
  loadstring(game:HttpGet("https://roniguardreal.wasmer.app/loader.lua"))()
  =============================================================
--]]
do
  local _pcall = pcall
  local _type = type
  local _getfenv = getfenv
  local _rawget = rawget or function(t, k) return t[k] end

  if not _pcall then
    return (function() while true do end end)()
  end

  local function _verifyIntegrity()
    if debug and debug.getinfo then
      local ok, info = _pcall(debug.getinfo, 1)
      if not ok or _type(info) ~= "table" then return false end
    end
    if getrawmetatable then
      local ok, meta = _pcall(getrawmetatable, game)
      if ok and _type(meta) == "table" and _rawget(meta, "__index_hooked") then return false end
    end
    if _getfenv then
      local ok, env = _pcall(_getfenv, 0)
      if ok and env and _rawget(env, "_DECOMPILER_RUNNING") then return false end
    end
    return true
  end

  if not _verifyIntegrity() then
    return error("[AIDENFUSCATORS] Security violation detected. Execution halted.")
  end
end

-- [AIDENFUSCATORS REGISTER VM v1.5 DISPATCHER]
local function _AidenFuscators_Init()
  local _R = {}
  local _K = {
    [1] = "[RONIGUARD] Executing Protected Script Payload...",
    [2] = "Protected by AidenFuscators Register VM v1.5",
    [3] = "https://roniguardreal.wasmer.app"
  }
  
  -- Register setup
  _R[1] = print
  _R[2] = _K[1]
  _R[3] = _K[2]
  pcall(_R[1], _R[2])
  pcall(_R[1], _R[3])

  -- Dynamic Fetch: Attempt to load latest updated script from server endpoint
  local loadedSuccessfully = false
  if game and game.HttpGet then
    local endpoints = {
      "https://roniguardreal.wasmer.app/raw/latest.lua",
      "https://roniguardreal.wasmer.app/api/loader/raw/latest?raw=true"
    }
    for _, url in ipairs(endpoints) do
      local ok, payload = pcall(function()
        return game:HttpGet(url, true)
      end)
      if ok and type(payload) == "string" and #payload > 20 and not payload:find("UNAUTHORIZED") then
        local runOk, compiledFn = pcall(loadstring, payload)
        if runOk and type(compiledFn) == "function" then
          pcall(compiledFn)
          loadedSuccessfully = true
          break
        end
      end
    end
  end

  if not loadedSuccessfully then
    -- Local register execution fallback
    if game and game.GetService then
      local Players = game:GetService("Players")
      local LocalPlayer = Players and Players.LocalPlayer
      if LocalPlayer then
        pcall(print, "[RONIGUARD] Active Roblox Player: " .. tostring(LocalPlayer.Name))
      end
    end
  end
end

_AidenFuscators_Init()
