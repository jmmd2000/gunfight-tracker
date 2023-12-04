import { useEffect } from "react";
import { toast } from "react-toastify";

export const useToastEffect = (
  isLoading: boolean,
  success: boolean,
  cannotDoAction: boolean,
  toastId: string,
  loadingMessage: string,
  successMessage: string,
  errorMessage: string,
) => {
  useEffect(() => {
    if (isLoading) {
      toast.loading(loadingMessage, {
        toastId,
      });
    } else if (success) {
      toast.update(toastId, {
        render: successMessage,
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } else if (cannotDoAction && !isLoading && !success) {
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  }, [isLoading, cannotDoAction, success]);
};
