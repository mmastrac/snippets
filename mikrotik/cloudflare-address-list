# Sync a local firewall address list w/the cloudflare public IP list

:local list "cloudflare"
:local file "cloudflare-ips-v4.txt"
:local url "https://www.cloudflare.com/ips-v4"

:local split do={
  :local x $1
  :local r [:toarray ""]
  :while ($x ~ "\n") do={
    :local pos [ :find $x "\n" ];
    :local i [ :pick $x 0 $pos ]
    :set ($r->$i) $i
    :set x ( [ :pick $x ($pos + 1) [:len $x] ] );
  }
  :return $r
}

:local fetch do={
  :local url $1
  :local file $2

  # Remove any existing file
  /file remove [/file find name=$file]

  # Fetch the IP list
  /tool fetch mode=https url=$url dst-path=$file
  :put "Fetched!"

  # Wait for the file to settle
  :local retry 0
  :while ([:len [/file find name=$file]] = 0 || [:len [/file get $file contents]] = 0) do={
    :put "Waiting for file..."
    :delay 0.1s

    :set retry ($retry + 1)
    :if ($retry = 20) do={
      :error "Couldn't find the file!"
    }
  }

  :local ips [/file get $file contents]
  /file remove [/file find name=$file]

  return $ips
}

:local ips [$split [$fetch $url $file]]
:local oldips [:toarray ""]

/ip firewall address-list;

:local removed 0
:local added 0

# Process old IPs first
:foreach k,v in=[find where list=$list] do={
  :local address [get $v address]
  :set ($oldips->$address) [:tostr $address]
  :if ( ( $ips->$address ) != $address ) do={
    :put ("Removing " . $address)
    remove $v
    :set $removed ($removed + 1)
  }
}

# Then process the new IPs
:foreach k,v in=$ips do={
  :if ( ( $oldips->$k ) != $k ) do={
    :put ("Adding " . $k)
    add address=$k list=$list
    :set $added ($added + 1)
  }
}

:put ("Processed " . [:len $ips] . " IP ranges. Added: " . $added . ", removed " . $removed . ".")
