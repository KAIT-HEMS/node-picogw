#!/bin/sh

find ./ -name "localstorage.json" -exec rm {} \;
rm ./v1/plugins/admin/settings.json
rm ./v1/plugins/healbe/settings.json
rm ./v1/plugins/openwethermap/settings.json
rm ./clients/.key
rm ./clients/localstorage.json
rm -rf ./clients/web/default/localstorage
rm -rf ./clients/web/custom/localstorage
rm -rf /v1/plugins/db/data
