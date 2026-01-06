import { createFileRoute } from '@tanstack/react-router'
import MDXContent from '../../docs/api/sse.mdx'
import { DocWrapper, mdxComponents } from '@/components/docs/doc-page'

export const Route = createFileRoute('/docs/api/sse')({
  component: () => (
    <DocWrapper currentPath="/docs/api/sse">
      <MDXContent components={mdxComponents} />
    </DocWrapper>
  ),
})
