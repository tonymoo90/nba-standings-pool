// AuthGate.tsx
import * as React from "react";
import AuthModal from "./AuthModal";
import { supabase } from "../lib/supabase";

type Props = {
  // if true we block the UI and force the modal open
  required: boolean;
  // called when the user has either logged in or you've accepted a tagged email
  onSatisfied: () => void;
  // for “attach my email”
  onEmailTagged: (email: string) => void;
};

export default function AuthGate({ required, onSatisfied, onEmailTagged }: Props) {
  const [open, setOpen] = React.useState(false);

  // open immediately if auth is required
  React.useEffect(() => {
    if (required) setOpen(true);
    else setOpen(false);
  }, [required]);

  // close automatically when a session appears
  React.useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        onSatisfied();
        setOpen(false);
      }
    };
    init();
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        onSatisfied();
        setOpen(false);
      }
    });
    return () => sub.data.subscription.unsubscribe();
  }, [onSatisfied]);

  return (
    <AuthModal
      open={open}
      onClose={() => {
        // Don’t allow closing while required
        if (!required) setOpen(false);
      }}
      onEmailTagged={(email) => {
        onEmailTagged(email);
        onSatisfied();
        setOpen(false);
      }}
    />
  );
}
