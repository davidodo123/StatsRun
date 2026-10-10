import { startTransition, type FormEvent } from "react";

/**
 * Envío de un formulario sin el vaciado automático de React 19: con `<form action>` se limpia al acabar la acción,
 * también cuando vuelve con un error, y se pierde lo escrito. Así los campos se quedan como estaban.
 */
export const keepForm = (action: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
  if (submitter?.name) fd.append(submitter.name, submitter.value);
  startTransition(() => action(fd));
};
