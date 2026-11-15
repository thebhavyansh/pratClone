function captureFailure(error){
  const name=error?.name||'';
  if(name==='NotAllowedError'||name==='PermissionDeniedError'||name==='SecurityError')return 'Capture permission denied. Allow screen recording and try again.';
  if(name==='NotFoundError')return 'No display or window is available to capture.';
  return `Capture unavailable: ${error?.message||'unknown error'}`;
}
if(typeof module!=='undefined')module.exports={captureFailure};
if(typeof window!=='undefined')window.captureFailure=captureFailure;
