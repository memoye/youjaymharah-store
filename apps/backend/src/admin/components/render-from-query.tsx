type RenderFromQueryProps = {
  isLoading: boolean;
  isError: boolean;

  isEmpty?: boolean;
  loading: React.ReactNode;
  error: React.ReactNode;
  empty?: React.ReactNode;
  children: React.ReactNode;
};

export function RenderFromQuery({
  isLoading,
  isError,
  isEmpty,
  children,
  empty,
  loading,
  error,
}: RenderFromQueryProps) {
  if (isLoading) {
    return loading;
  }

  if (isError) {
    return error;
  }

  if (isEmpty) {
    return empty;
  }

  return children;
}
