import path from "path";

module.exports = {
    mode: 'development',
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.ts|\.tsx$/, use: 'ts-loader',
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/env', '@babel/typescript']
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: [
            'tsx', 'ts', 'js',
        ],
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
