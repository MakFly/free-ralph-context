import { createFileRoute } from '@tanstack/react-router'
import MDXContent from '../../docs/advanced/troubleshooting.mdx'
import { DocWrapper, mdxComponents } from '@/components/docs/doc-page'

export const Route = createFileRoute('/docs/advanced/troubleshooting')({
  component: () => (
    <DocWrapper currentPath="/docs/advanced/troubleshooting">
      <MDXContent components={mdxComponents} />
    </DocWrapper>
  ),
})
