import fetch, { RequestInit, HeadersInit, Response } from 'node-fetch';
import { Config } from '@backstage/config';
import { ReaderFactory, UrlReader } from './types';
import { NotFoundError } from '../errors';

type Options = {
  host: string;
  auth?: {
    username: string;
    personalToken: string;
  };
};

function readConfig(config: Config): Options[] {
  const optionsArr = Array<Options>();

  const providerConfigs =
    config.getOptionalConfigArray('integrations.bitbucketServer') ?? [];

  for (const providerConfig of providerConfigs) {
    const host = providerConfig.getString('host');

    let auth;
    if (providerConfig.has('username')) {
      const username = providerConfig.getString('username');
      const personalToken = providerConfig.getString('personalToken');
      auth = { username, personalToken };
    }

    optionsArr.push({ host, auth });
  }

  return optionsArr;
}

export class BitbucketServerUrlReader implements UrlReader {
  static factory: ReaderFactory = ({ config }) => {
    return readConfig(config).map(options => {
      const reader = new BitbucketServerUrlReader(options);
      const predicate = (url: URL) => url.host === options.host;
      return { reader, predicate };
    });
  };

  constructor(private readonly options: Options) {
    if (!options.host) {
      throw Error('Bitbucket Server host is required');
    }
  }

  async read(url: string): Promise<Buffer> {
    const builtUrl = this.buildRawUrl(url);

    let response: Response;
    try {
      response = await fetch(builtUrl.toString(), this.getRequestOptions());
    } catch (e) {
      throw new Error(`Unable to read ${url}, ${e}`);
    }

    if (response.ok) {
      return response.buffer();
    }

    const message = `${url} could not be read as ${builtUrl}, ${response.status} ${response.statusText}`;
    if (response.status === 404) {
      throw new NotFoundError(message);
    }
    throw new Error(message);
  }

  // Converts
  // from: https://bitbucket-server.corp.com/projects/projectname/repos/repo-slug/browse/template.yaml
  // to:   https://bitbucket-server.corp.com/rest/api/1.0/projects/ssft/repos/repo-slug/raw/template.yaml

  buildRawUrl(target: string): URL {
    try {
      const url = new URL(target);

      const [
        empty,
        projectsKeyword,
        projectName,
        reposKeyword,
        repoName,
        browseKeyword,
        ...restOfPath
      ] = url.pathname.split('/');

      if (
        url.hostname === '' ||
        empty !== '' ||
        projectsKeyword !== 'projects' ||
        projectName === '' ||
        reposKeyword !== 'repos' ||
        repoName === '' ||
        browseKeyword !== 'browse'
      ) {
        throw new Error('Wrong Bitbucket Server URL or Invalid file path');
      }

      // transform to api
      url.pathname = [
        empty,
        'rest/api/1.0',
        projectsKeyword,
        projectName,
        reposKeyword,
        repoName,
        'raw',
        ...restOfPath,
      ].join('/');
      // url.hostname = 'api.bitbucket.org';
      url.protocol = 'https';

      return url;
    } catch (e) {
      throw new Error(`Incorrect url: ${target}, ${e}`);
    }
  }

  private getRequestOptions(): RequestInit {
    const headers: HeadersInit = {};

    if (this.options.auth) {
      headers.Authorization = `Basic ${Buffer.from(
        `${this.options.auth.username}:${this.options.auth.personalToken}`,
        'utf8',
      ).toString('base64')}`;
    }

    return {
      headers,
    };
  }

  toString() {
    const { host, auth } = this.options;
    return `bitbucket-server{host=${host},authed=${Boolean(auth)}}`;
  }
}
