import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as installer from './installer'
import * as io from '@actions/io'
import * as os from 'os'
import * as path from 'path'
import {promises as fs} from 'fs'

async function run(): Promise<void> {
  const runnerTmpdir = process.env['RUNNER_TEMP'] || os.tmpdir()
  const tmpdir = await fs.mkdtemp(path.join(runnerTmpdir, 'reviewdog-'))

  try {
    const reviewdogVersion = core.getInput('reviewdog_version') || 'latest'
    const toolName = core.getInput('tool_name') || 'clippy'
    const clippyFlags = core.getInput('clippy_flags');
    const level = core.getInput('level') || 'error'
    const reporter = core.getInput('reporter') || 'github-pr-check'
    const filterMode = core.getInput('filter_mode') || 'added'
    const failOnError = core.getInput('fail_on_error') || 'false'
    const reviewdogFlags = core.getInput('reviewdog_flags')
    const workdir = core.getInput('workdir') || '.'
    const cwd = path.relative(
      process.env['GITHUB_WORKSPACE'] || process.cwd(),
      workdir
    )

    const reviewdog = await core.group(
      '🐶 Installing reviewdog ... https://github.com/reviewdog/reviewdog',
      async () => {
        return await installer.installReviewdog(reviewdogVersion, tmpdir)
      }
    )

    const code = await core.group(
      'Running Clippy with reviewdog 🐶 ...',
      async (): Promise<number> => {
        const output: string[] = []
        await exec.exec(
          'cargo',
          ['clippy', '--color', 'never', '-q', '--message-format', 'json', ...parse(clippyFlags)],
          {
            cwd,
            ignoreReturnCode: true,
            listeners: {
              stdline: (line: string) => {
                let content: CompilerMessage
                try {
                  content = JSON.parse(line)
                } catch (error) {
                  core.debug('failed to parse JSON')
                  return
                }

                if (content.reason !== 'compiler-message') {
                  core.debug('ignore all but `compiler-message`')
                  return
                }

                if (content.message.code === null) {
                  core.debug('message code is missing, ignore it')
                  return
                }

                core.debug('this is a compiler-message!')
                const span = content.message.spans[0]
                const rendered =
                  reporter === 'github-pr-review'
                    ? ` \n<pre><code>${content.message.rendered}</code></pre>\n__END__`
                    : `${content.message.rendered}\n__END__`
                const ret = `${span.file_name}:${span.line_start}:${span.column_start}:${rendered}`
                output.push(ret)
              }
            }
          }
        )

        core.info(`debug: ${output.join('\n')}`)

        process.env['REVIEWDOG_GITHUB_API_TOKEN'] =
          core.getInput('github_token')
        return await exec.exec(
          reviewdog,
          [
            '-efm=%E%f:%l:%c:%m',
            '-efm=%Z__END__',
            '-efm=%C%m',
            '-efm=%C',
            `-name=${toolName}`,
            `-reporter=${reporter}`,
            `-filter-mode=${filterMode}`,
            `-fail-on-error=${failOnError}`,
            `-level=${level}`,
            ...parse(reviewdogFlags)
          ],
          {
            cwd,
            input: Buffer.from(output.join('\n'), 'utf-8'),
            ignoreReturnCode: true
          }
        )
      }
    )

    if (code !== 0) {
      core.setFailed(`reviewdog exited with status code: ${code}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  } finally {
    // clean up the temporary directory
    try {
      await io.rmRF(tmpdir)
    } catch (error) {
      // suppress errors
      // Garbage will remain, but it may be harmless.
      if (error instanceof Error) {
        core.info(`clean up failed: ${error.message}`)
      } else {
        core.info(`clean up failed: ${error}`)
      }
    }
  }
}

function parse(flags: string): string[] {
  flags = flags.trim()
  if (flags === '') {
    return []
  }

  return flags.split(/\s+/)
}

interface CompilerMessage {
  reason: string
  message: {
    code: Code
    level: string
    message: string
    rendered: string
    spans: Span[]
  }
}

interface Code {
  code: string
  explanation?: string
}

interface Span {
  file_name: string
  is_primary: boolean
  line_start: number
  line_end: number
  column_start: number
  column_end: number
}

run()
