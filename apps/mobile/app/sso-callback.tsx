import { Redirect } from 'expo-router';

/**
 * The address Google returns to after sign-in (`tnsi://sso-callback`). The
 * sign-in itself is finished by the Google button; this route only exists so
 * the operating system's return to the app lands somewhere real instead of an
 * "unmatched route" screen. It hands straight on to the app, and the auth gate
 * in the root layout decides between the tabs and the sign-in screen.
 */
export default function SsoCallback() {
  return <Redirect href="/" />;
}
