import React from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'alert' | 'error' | 'warning' | 'success';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const DialogComponent: React.FC<DialogOptions & { close: () => void }> = ({
  title, message, type = 'alert', onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', close
}) => {
  const isDark = document.documentElement.classList.contains('dark');
  const isConfirm = !!onCancel;

  const bgClasses = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const overlayClasses = isDark ? 'bg-slate-950/80' : 'bg-slate-900/40';

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${overlayClasses}`}>
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 animate-in zoom-in-95 duration-200 ${bgClasses}`}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {type === 'error' && <AlertCircle className="w-12 h-12 text-rose-500" />}
            {type === 'warning' && <AlertCircle className="w-12 h-12 text-amber-500" />}
            {type === 'success' && <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
            {type === 'alert' && <Info className="w-12 h-12 text-blue-500" />}
          </div>
          <h3 className="text-lg font-bold mb-2">{title || (type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : type === 'success' ? 'Success' : 'Notice')}</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{message}</p>
          
          <div className="flex items-center gap-3 w-full">
            {isConfirm && (
              <button
                onClick={() => {
                  close();
                  if (onCancel) onCancel();
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                close();
                if (onConfirm) onConfirm();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-colors text-white ${type === 'error' || type === 'warning' ? 'bg-rose-600 hover:bg-rose-500' : type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function showDialog(options: DialogOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const root = createRoot(container);
  
  const close = () => {
    root.unmount();
    container.remove();
  };

  root.render(<DialogComponent {...options} close={close} />);
}

export function customAlert(message: string, title?: string, type?: DialogOptions['type']) {
  return new Promise<void>((resolve) => {
    showDialog({
      message,
      title,
      type: type || 'alert',
      onConfirm: resolve
    });
  });
}

export function customConfirm(message: string, title?: string, type?: DialogOptions['type'], confirmText = 'Confirm') {
  return new Promise<boolean>((resolve) => {
    showDialog({
      message,
      title,
      type: type || 'warning',
      confirmText,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

interface PromptDialogOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

const PromptDialogComponent: React.FC<PromptDialogOptions & { close: (value: string | null) => void }> = ({
  title, message, defaultValue = '', placeholder = '', confirmText = 'Submit', cancelText = 'Cancel', close
}) => {
  const [value, setValue] = React.useState(defaultValue);
  const isDark = document.documentElement.classList.contains('dark');

  const bgClasses = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const overlayClasses = isDark ? 'bg-slate-950/80' : 'bg-slate-900/40';

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 ${overlayClasses}`}>
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 animate-in zoom-in-95 duration-200 ${bgClasses}`}>
        <div className="flex flex-col">
          <h3 className="text-lg font-bold mb-1">{title || 'Input Required'}</h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{message}</p>
          
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className={`w-full text-sm rounded-xl px-3.5 py-2.5 mb-5 border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') close(value);
              if (e.key === 'Escape') close(null);
            }}
          />

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => close(null)}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => close(value)}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-colors text-white bg-blue-600 hover:bg-blue-500"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function customPrompt(message: string, defaultValue = '', title?: string) {
  return new Promise<string | null>((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    const root = createRoot(container);
    
    const close = (val: string | null) => {
      root.unmount();
      container.remove();
      resolve(val);
    };

    root.render(<PromptDialogComponent message={message} defaultValue={defaultValue} title={title} close={close} />);
  });
}
