import random
import time
from hashlib import sha1
random.seed(12345)
print "The keysize in bits is", sha1().digest_size * 8





def testWide(trials):
    mal = generateRandomIP()
    success = 0.0
    times = []
    for _ in xrange(trials):
        start = time.time() 
        n = getHash(generateRandomIP())
        m = getHash(generateRandomIP())
        for j in xrange(49152,65535):
            port = str(j)
            attempt = getHash(mal+port)
            if hashBetween(attempt,n,m):
                success += 1
                break
        times.append(time.time() - start)
    print "Successes:", success/trials,"Avg time:", sum(times)/trials 






def testSuccessors(trials):
    mal = generateRandomIP()
    victims =  [getHash(generateRandomIP()+generateRandomPort()) for _ in xrange(trials)]
    victims = sorted(victims)
    success = 0.0
    times = []
    for i in xrange(trials -1):
        start = time.time() 
        n = victims[i]
        m = victims[i+1]

        for j in xrange(49152,65535):
            port = str(j)
            attempt = getHash(mal+port)
            if hashBetween(attempt,n,m):
                success += 1
                break
        times.append(time.time() - start)
    print "Successes:", success/trials,"Avg time:", sum(times)/trials



def getHash(value):
    return long(sha1(value).hexdigest(),16)

def hashBetween(target, left, right):
    if left ==  right:
        return True
    if target == left or target == right:
        return False
    #print target, "<", right, "and", target, ">", left, target < right and target > left
    if target < right and target > left:
        return True
    #print left, ">", right, left > right 
    if left > right :
        #print left, ">", target, "and", target, "<", right, left > target and target < right
        if left > target and target < right:
            return True
        #print left, "<", target, "and", target, ">", right, left < target and target > right
        if left < target and target > right:
            return True
    return False


def generateRandomIP():
    return "".join(map(str, (random.randint(0,255) for _ in range(4))))

def generateRandomPort():
    return str(random.randint(0,65535))


testWide(100000)
testSuccessors(100)