import { useEffect } from "react";
import { toast } from "react-toastify";

//- TODO: modify this to include error states
export const useToastEffect = (
  isLoading: boolean,
  success: boolean,
  cannotDoAction: boolean,
  toastId: string,
  loadingMessage: string,
  successMessage: string,
) => {
  useEffect(() => {
    console.log("effect run", {
      isLoading,
      success,
      cannotDoAction,
      toastId,
      loadingMessage,
      successMessage,
    });

    if (isLoading) {
      toast.loading(loadingMessage, { toastId });
    } else if (success) {
      toast.update(toastId, {
        render: successMessage,
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    }
  }, [
    isLoading,
    cannotDoAction,
    loadingMessage,
    toastId,
    successMessage,
    success,
  ]);
};
