type ToastType = 'success' | 'error';

interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastMessageProps {
  toast: ToastState | null;
  positionClassName?: string;
  textClassName?: string;
}

export default function ToastMessage({
  toast,
  positionClassName = 'top-4 right-4 z-50',
  textClassName = '',
}: ToastMessageProps) {
  if (!toast) return null;

  return (
    <div
      className={`fixed ${positionClassName} px-4 py-3 rounded-lg shadow-lg text-white ${textClassName} ${
        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {toast.message}
    </div>
  );
}
