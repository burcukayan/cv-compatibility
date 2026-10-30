export function SessionExpiredNotice() {
  return (
    <>
      Your session has expired. Please log in again.{" "}
      <a
        href="/auth/login"
        className="font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Log in
      </a>
    </>
  );
}
