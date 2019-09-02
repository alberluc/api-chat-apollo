import {User} from './user'
import {Stream} from "stream"

export interface Context {
    user?: User
}

export interface Upload {
    createReadStream: () => Stream;
    filename: string;
    mimetype: string;
    encoding: string;
}