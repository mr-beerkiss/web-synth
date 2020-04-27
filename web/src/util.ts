enum LogType {
  INFO = "info",
  ERROR = "error"
}

// TODO: Fix awkward union
let msgLog: HTMLElement | null;

function writeMessage(type: LogType, msg: string) {
  if (!msgLog) {
    msgLog = document.querySelector(".message-log");
  }

  const p = document.createElement("p");
  p.classList.add(`message-log-${type}`);
  p.textContent = msg;

  msgLog!.appendChild(p);
}

export function info(msg: string) {
  console.log(msg);
  writeMessage(LogType.INFO, msg);
}

export function err(msg: string, error: Error) {
  console.error(msg, error);
  const errMsg = error ? `${msg}. Details: ${error.message}` : msg;
  writeMessage(LogType.ERROR, errMsg);
}

