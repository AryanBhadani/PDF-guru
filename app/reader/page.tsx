import { ReaderClient } from "./reader-client";

export default function ReaderPage({
  searchParams,
}: {
  searchParams: { file?: string };
}) {
  return <ReaderClient fileUrl={searchParams.file} />;
}
