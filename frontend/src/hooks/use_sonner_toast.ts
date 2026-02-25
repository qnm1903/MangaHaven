import { toast } from 'sonner';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
  icon?: React.ReactNode;
}

export const useToast = () => {
  const showToast = ({ title, description, variant = 'default', duration, icon }: ToastOptions) => {
    const message = title;
    const options = {
      description,
      duration,
      icon,
    };
    
    switch (variant) {
      case 'destructive':
        toast.error(message, options);
        break;
      case 'success':
        toast.success(message, options);
        break;
      default:
        toast(message, options);
        break;
    }
  };

  return { 
    toast: showToast,
    // Provide additional toast methods directly
    success: (message: string, description?: string) => 
      toast.success(message, { description }),
    error: (message: string, description?: string) => 
      toast.error(message, { description }),
    info: (message: string, description?: string) => 
      toast.info(message, { description }),
    loading: (message: string, description?: string) => 
      toast.loading(message, { description }),
    warning: (message: string, description?: string) => 
      toast.warning(message, { description }),
    dismiss: toast.dismiss,
  };
};
