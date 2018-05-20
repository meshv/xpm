var progress = require('progress')
    colors = require('chalk')
    https = require('https')
    repos = require(__dirname + '/repolist.json')
    zip = require('unzip')
    sys = require('fs')
    ncp = require('ncp').ncp
    rm = require('rimraf')

if(!process.argv[2])
{
    console.log(colors.red("Error: ") + "No Command Given")
} else {
    switch(process.argv[2].toLowerCase())
    {
        case "install":
            if(process.argv[3] && Object.keys(repos).indexOf(process.argv[3].toLowerCase()) > -1)
            {
                var url = repos[process.argv[3].toLowerCase()]
                var pkg = sys.createWriteStream(process.argv[3].toLowerCase() + ".pkg")
                console.log(colors.green("Downloading ") + process.argv[3].toLowerCase() + colors.green(" from ") + url)
                https.get(url, res => {
                    var len = parseInt(res.headers['content-length'], 10)
                    var download = new progress('[' + colors.green(':bar') + '] :rate bps | :percent | :eta', {
                        complete: "#",
                        incomplete: " ",
                        width: 20,
                        total: len
                    })
                    res.on('data', chunk => {
                        download.tick(chunk.length)
                        pkg.write(chunk)
                    })
                    res.on('end', () => {
                        console.log(colors.green("Extracting ") + process.argv[3].toLowerCase() + colors.green(" to ") + process.argv[3].toLowerCase() + "/")
                        sys.mkdir(process.argv[3].toLowerCase(), err => {
                            if(err) {
                                console.log(colors.red("Error: ") + err)
                                process.exit(0)
                            }
                            sys.createReadStream(process.argv[3].toLowerCase() + ".pkg").pipe(zip.Extract({ path: process.argv[3].toLowerCase() }))
                            sys.unlink(process.argv[3].toLowerCase() + ".pkg", err => {
                                if(err) {
                                    console.log(colors.red("Error: ") + err)
                                    process.exit(0)
                                }
                                console.log(colors.green("Checking For Package ") + "metadata.json")
                                setTimeout(function() {
                                    if(sys.existsSync('./' + process.argv[3].toLowerCase() + '/metadata.json'))
                                    {
                                        var metadata = require('./' + process.argv[3].toLowerCase() + "/metadata.json")
                                        if(metadata['location'])
                                        {
                                            ncp("./" + process.argv[3].toLowerCase() + "/", metadata['location'], err => {
                                                if(err)
                                                {
                                                    console.log(colors.red("Error: ") + err)
                                                    process.exit(0)
                                                }
                                                console.log(colors.green("Finished Installing ") + process.argv[3].toLowerCase())
                                                sys.writeFile(__dirname + "/instances.db", process.argv[3].toLowerCase() + ":" + metadata['location'], err => {
                                                    if(err)
                                                    {
                                                        console.log(colors.red("Error: ") + err)
                                                        process.exit(0)
                                                    }
                                                    rm('test/', err => {
                                                        if(err)
                                                        {
                                                            console.log(colors.red("Error: ") + 'Can Not Find Source Directory')
                                                            process.exit(0)
                                                        }
                                                    })
                                                })
                                            })
                                        } else {
                                            console.log(colors.yellow("Warning: ") + "No Location Set, Keeping Package In Default Location")
                                        }
                                    } else {
                                        console.log(colors.red("Error: ") + "Package Metadata File Missing")
                                    }
                                }, 1500)
                            })
                        })
                    })
                })
            } else {
                console.log(colors.red("Error: ") + "Invalid Package")
            }
            break
        case "remove":
            if(process.argv[3])
            {
                var location = ""
                sys.stat(__dirname + '/instances.db', (err, stat) => {
                    if(err)
                    {
                        console.log(colors.red("Error: ") + err)
                        process.exit(0)
                    }
                    sys.readFile(__dirname + '/instances.db', 'utf-8', (err, data) => {
                        var lines = data.split('\n')
                        for(var i = 0; i < lines.length; i++)
                        {
                            var line = lines[i].split(":")
                            if(line[0] == process.argv[3].toLowerCase())
                            {
                                location = line[1]
                            }
                        }
                        if(location != "")
                        {
                            rm(location, err => {
                                if(err)
                                {
                                    console.log(colors.red('Error: ') + err)
                                    process.exit(0)
                                }
                                for(var i = 0; i < lines.length; i++)
                                {
                                    if(lines[i].indexOf(process.argv[3].toLowerCase()) > -1)
                                    {
                                        lines[i] = ""
                                        sys.writeFile(__dirname + '/instances.db', lines.join('\n'), err => {
                                            if(err)
                                            {
                                                console.log(colors.red('Error: ') + 'Failed To Update Instances File')
                                            }
                                        })
                                    }
                                }
                                console.log(colors.green('Package Removed ') + process.argv[3].toLowerCase())
                            })
                        } else {
                            console.log(colors.red('Error: ') + 'Package Not Installed')
                        }
                    })
                })
            } else {
                console.log(colors.red('Error: ') + 'No Package Given')
            }
            break
        default:
            console.log(colors.red("Error: ") + "Invalid Command")
            break
    }
}
