import { createFileRoute } from '@tanstack/react-router'
import MDXContent from '../../docs/api/rest.mdx'
import { DocWrapper, mdxComponents } from '@/components/docs/doc-page'

export const Route = createFileRoute('/docs/api/rest')({
  component: () => (
    <DocWrapper currentPath="/docs/api/rest">
      <MDXContent components={mdxComponents} />
    </DocWrapper>
  ),
})
